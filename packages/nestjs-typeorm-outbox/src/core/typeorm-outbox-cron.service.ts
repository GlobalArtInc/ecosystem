import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from "@nestjs/common";
import {
  InjectTypeormOutboxBroker,
  InjectTypeormOutboxCronConfig,
} from "./typeorm-outbox.di-tokens";
import { hashStringToInt } from "@globalart/text-utils";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { firstValueFrom } from "rxjs";
import { ClientProxy, Transport } from "@nestjs/microservices";
import { CronJob } from "cron";
import { TypeormOutboxRegisterCronModuleOptions } from "./typeorm-outbox.interfaces";
import { DataSource } from "typeorm";
import { CronExpression } from "./typeorm-outbox.enums";

@Injectable()
export class TypeormOutboxCronService implements OnApplicationBootstrap {
  constructor(
    @InjectTypeormOutboxBroker()
    private readonly brokerClient: ClientProxy,
    @InjectTypeormOutboxCronConfig()
    private readonly moduleConfig: TypeormOutboxRegisterCronModuleOptions,
    private readonly dataSource: DataSource,
  ) {}

  onApplicationBootstrap() {
    this.validateBrokerClient();
    const cronJob = new CronJob(
      this.moduleConfig.cronExpression ?? CronExpression.EVERY_SECOND,
      () => {
        this.executeCronJob();
      },
    );
    cronJob.start();
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    const lockKey = hashStringToInt("typeorm-outbox-cron-lock");

    try {
      const lockResult = await queryRunner.query(
        "SELECT pg_try_advisory_lock($1) as locked",
        [lockKey],
      );

      if (!lockResult[0].locked) {
        return;
      }
      try {
        await queryRunner.startTransaction("REPEATABLE READ");

        const entities = await queryRunner.manager.find(TypeormOutboxEntity, {
          order: {
            createdAt: "ASC",
          },
        });

        for (const entity of entities) {
          await firstValueFrom(
            this.brokerClient.emit(entity.destinationTopic, {
              key: entity.keys,
              value: entity.payload,
              headers: entity.headers,
            }),
          );
          await queryRunner.manager.delete(TypeormOutboxEntity, entity.id);
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.query("SELECT pg_advisory_unlock($1)", [lockKey]);
      }
    } finally {
      await queryRunner.release();
    }
  }
}
