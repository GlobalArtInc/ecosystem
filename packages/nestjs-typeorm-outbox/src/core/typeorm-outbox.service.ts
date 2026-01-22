import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { Repository } from "typeorm";

type createOutboxOptions = {
  destinationTopic: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
  keys?: Record<any, any>;
};

@Injectable()
export class TypeormOutboxService {
  constructor(
    @InjectRepository(TypeormOutboxEntity)
    private readonly outboxRepository: Repository<TypeormOutboxEntity>,
  ) {}

  async create(options: createOutboxOptions) {
    await this.outboxRepository.save({
      destinationTopic: options.destinationTopic,
      headers: options.headers,
      keys: options.keys,
      payload: options.payload,
    });
  }
}
