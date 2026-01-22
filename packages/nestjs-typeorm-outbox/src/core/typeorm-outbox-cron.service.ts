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

@Injectable()
export class TypeormOutboxCronService implements OnModuleInit {
  constructor(
    private readonly entityManager: EntityManager,
    @InjectRepository(TypeormOutboxEntity)
    private readonly outboxRepository: Repository<TypeormOutboxEntity>,
    @InjectTypeormOutboxBroker()
    private readonly brokerClient: ClientProxy,
    @InjectTypeormOutboxCronConfig()
    private readonly moduleConfig: TypeormOutboxRegisterCronModuleOptions,
  ) {}

  onModuleInit() {
    const cronJob = new CronJob(this.moduleConfig.cronExpression ?? CronExpression.EVERY_10_SECONDS, () => {
      this.executeCronJob();
    });
    cronJob.start();
  }

  async executeCronJob() {
    const lockId = hashStringToInt("typeorm-outbox-cron-job");
    const [{ pg_try_advisory_xact_lock: acquired }] =
      await this.entityManager.query<{ pg_try_advisory_xact_lock: boolean }[]>(
        `SELECT pg_try_advisory_xact_lock(${lockId})`,
      );
    if (!acquired) {
      return;
    }

    const entities = await this.outboxRepository.find();
    
    for (const entity of entities) {
      await firstValueFrom(
        this.brokerClient.emit(entity.destinationTopic, {
          key: entity.keys,
          value: entity.payload,
          headers: entity.headers,
        }),
      );
      await this.outboxRepository.delete(entity.id);
    }
  }
}
