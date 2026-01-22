import { Controller } from "@nestjs/common";
import { InjectTypeormOutboxBroker } from "./typeorm-outbox.di-tokens";
import { Cron, CronExpression } from "@nestjs/schedule";
import { hashStringToInt } from "@globalart/text-utils";
import { EntityManager, Repository } from "typeorm";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { firstValueFrom } from "rxjs";
import { ClientProxy } from "@nestjs/microservices";

@Controller()
export class TypeormOutboxController {
  constructor(
    private readonly entityManager: EntityManager,
    @InjectRepository(TypeormOutboxEntity)
    private readonly outboxRepository: Repository<TypeormOutboxEntity>,
    @InjectTypeormOutboxBroker()
    private readonly brokerClient: ClientProxy,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleOutboxCron() {
    await this.executeCronJob();
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
