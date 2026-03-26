import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";

export interface CreateOutboxOptions {
  destinationTopic: string;
  value: any;
  headers?: any;
  keys?: any;
}

@Injectable()
export class TypeormOutboxService {
  constructor(
    @InjectRepository(TypeormOutboxEntity)
    private readonly outboxRepository: Repository<TypeormOutboxEntity>,
  ) {}

  async create(options: CreateOutboxOptions): Promise<TypeormOutboxEntity> {
    return this.outboxRepository.save({
      id: randomUUID(),
      destinationTopic: options.destinationTopic,
      headers: options.headers,
      keys: options.keys,
      value: options.value,
    });
  }
}
