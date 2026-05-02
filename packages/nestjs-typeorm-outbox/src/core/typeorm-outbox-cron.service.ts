import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import {
  InjectTypeormOutboxBroker,
  InjectTypeormOutboxCronConfig,
} from "./typeorm-outbox.di-tokens";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { firstValueFrom } from "rxjs";
import {
  type CustomClientOptions,
  ClientProxy,
  Transport,
} from "@nestjs/microservices";
import { CronJob } from "cron";
import { TypeormOutboxRegisterCronModuleOptions } from "./typeorm-outbox.interfaces";
import { DataSource } from "typeorm";
import { CronExpression } from "./typeorm-outbox.enums";

@Injectable()
export class TypeormOutboxCronService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    @InjectTypeormOutboxBroker()
    private readonly brokerClient: ClientProxy,
    @InjectTypeormOutboxCronConfig()
    private readonly moduleConfig: TypeormOutboxRegisterCronModuleOptions,
    private readonly dataSource: DataSource,
  ) {}

  private cronJob!: CronJob;
  private isRunning = false;

  onApplicationBootstrap() {
    this.validateBrokerClient();
    this.cronJob = new CronJob(
      this.moduleConfig.cronExpression ?? CronExpression.EVERY_SECOND,
      () => {
        if (this.isRunning) return;
        this.isRunning = true;
        this.executeCronJob().finally(() => {
          this.isRunning = false;
        });
      },
    );
    this.cronJob.start();
  }

  onApplicationShutdown() {
    if (!this.cronJob) {
      return;
    }
    this.cronJob.stop();
  }

  private validateBrokerClient() {
    const brokerConfig = this.moduleConfig.brokerConfig;
    if (
      brokerConfig !== null &&
      typeof brokerConfig === "object" &&
      "customClass" in brokerConfig
    ) {
      if ((brokerConfig as CustomClientOptions).customClass == null) {
        throw new Error(
          `[TypeormOutboxCronService] Broker config with customClass must provide a non-null customClass (e.g. KafkaClient)`,
        );
      }
      return;
    }
    if (
      brokerConfig !== null &&
      typeof brokerConfig === "object" &&
      "strategy" in brokerConfig
    ) {
      if ((brokerConfig as { strategy?: unknown }).strategy == null) {
        throw new Error(
          `[TypeormOutboxCronService] Custom broker config must provide a non-null strategy (e.g. createKafkaMicroservice)`,
        );
      }
      return;
    }
    const transport = (brokerConfig as { transport?: Transport } | null)
      ?.transport;
    if (
      ![Transport.KAFKA, Transport.NATS, Transport.MQTT].includes(
        transport as Transport,
      )
    ) {
      throw new Error(
        `[TypeormOutboxCronService] Broker config must be KafkaOptions, NatsOptions, MqttOptions, customClass (e.g. KafkaClient), or a custom strategy (e.g. createKafkaMicroservice)`,
      );
    }
  }

  private async executeCronJob() {
    const entities = await this.claimPendingEntities();
    if (!entities.length) return;

    for (const entity of entities) {
      await firstValueFrom(
        this.brokerClient.emit(entity.destinationTopic, {
          key: entity.keys,
          value: entity.value,
          headers: entity.headers,
        }),
      );

      await this.finalizeEntity(entity.id);
    }
  }

  private async claimPendingEntities(): Promise<TypeormOutboxEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const entities = await queryRunner.manager
        .createQueryBuilder(TypeormOutboxEntity, "e")
        .where("e.status = :status", { status: "pending" })
        .orderBy("e.createdAt", "ASC")
        .setLock("pessimistic_partial_write")
        .getMany();

      if (entities.length) {
        await queryRunner.manager.update(
          TypeormOutboxEntity,
          entities.map((e) => e.id),
          { status: "processing" },
        );
      }

      await queryRunner.commitTransaction();
      return entities;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async finalizeEntity(id: string): Promise<void> {
    if (this.moduleConfig.deleteItem) {
      await this.dataSource.manager.delete(TypeormOutboxEntity, id);
    } else {
      await this.dataSource.manager.update(
        TypeormOutboxEntity,
        { id },
        { status: "sent" },
      );
    }
  }
}
