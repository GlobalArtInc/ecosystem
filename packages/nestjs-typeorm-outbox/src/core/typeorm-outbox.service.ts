import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { Repository } from "typeorm";

export interface CreateOutboxOptions {
  destinationTopic: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  keys?: Record<string, unknown>;
}

@Injectable()
export class TypeormOutboxService {
  constructor(
    @InjectRepository(TypeormOutboxEntity)
    private readonly outboxRepository: Repository<TypeormOutboxEntity>,
  ) {}

  async create(options: CreateOutboxOptions): Promise<TypeormOutboxEntity> {
    return this.outboxRepository.save({
      destinationTopic: options.destinationTopic,
      headers: options.headers,
      keys: options.keys,
      payload: options.payload,
    });
  }
}
