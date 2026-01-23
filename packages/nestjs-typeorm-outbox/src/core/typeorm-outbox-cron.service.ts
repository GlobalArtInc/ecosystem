import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectTypeormOutboxBroker, InjectTypeormOutboxCronConfig, InjectTypeormOutboxModuleConfig } from "./typeorm-outbox.di-tokens";
import { hashStringToInt } from "@globalart/text-utils";
import { EntityManager, Repository } from "typeorm";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { firstValueFrom } from "rxjs";
import { ClientProxy } from "@nestjs/microservices";
import { CronJob } from "cron";
import { TypeormOutboxRegisterCronModuleOptions } from "./typeorm-outbox.interfaces";
import { CronExpression } from "@nestjs/schedule";
import { DataSource } from "typeorm";

@Injectable()
export class TypeormOutboxCronService implements OnModuleInit {
  private readonly lockKey: number;

  constructor(
    private readonly entityManager: EntityManager,
    @InjectRepository(TypeormOutboxEntity)
    private readonly outboxRepository: Repository<TypeormOutboxEntity>,
    @InjectTypeormOutboxBroker()
    private readonly brokerClient: ClientProxy,
    @InjectTypeormOutboxCronConfig()
    private readonly moduleConfig: TypeormOutboxRegisterCronModuleOptions,
    private readonly dataSource: DataSource,
  ) {
    this.lockKey = hashStringToInt('typeorm-outbox-cron-lock');
  }

  onModuleInit() {
    const cronJob = new CronJob(this.moduleConfig.cronExpression ?? CronExpression.EVERY_10_SECONDS, () => {
      this.executeCronJob();
    });
    cronJob.start();
  }

  async executeCronJob() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const lockResult = await queryRunner.query(
        'SELECT pg_try_advisory_lock($1) as locked',
        [this.lockKey],
      );

      if (!lockResult[0].locked) {
        return;
      }
      try {
        await queryRunner.startTransaction('REPEATABLE READ');
        
        const entities = await queryRunner.manager.find(TypeormOutboxEntity);
        
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
        await queryRunner.query('SELECT pg_advisory_unlock($1)', [this.lockKey]);
      }
    } finally {
      await queryRunner.release();
    }
  }
}
