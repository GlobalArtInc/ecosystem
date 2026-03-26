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
import { ClientProxy, Transport } from "@nestjs/microservices";
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
      ![Transport.KAFKA, Transport.NATS, Transport.MQTT].includes(
        brokerConfig?.transport as Transport,
      )
    ) {
      throw new Error(
        `[TypeormOutboxCronService] Broker config must be an instance of KafkaOptions, NatsOptions, or MqttOptions`,
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
        .setLock("pessimistic_write_or_fail")
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

  private async finalizeEntity(id: number): Promise<void> {
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