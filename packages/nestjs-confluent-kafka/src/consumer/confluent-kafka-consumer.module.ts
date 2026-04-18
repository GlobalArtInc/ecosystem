import {
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  Module,
  ModuleMetadata,
} from "@nestjs/common";
import { MetadataScanner } from "@nestjs/core";
import { KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN } from "../constants/confluent-kafka.constants";
import { ConfluentKafkaConsumerExplorer } from "./confluent-kafka-consumer.explorer";
import { ConfluentKafkaConsumerRunner } from "./confluent-kafka-consumer.runner";
import type { ConfluentKafkaOptions } from "../types/confluent-kafka.types";

export type KafkaConsumerModuleOptions = ConfluentKafkaOptions;

export interface KafkaConsumerModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  useFactory: (...args: unknown[]) => ConfluentKafkaOptions | Promise<ConfluentKafkaOptions>;
  inject?: InjectionToken[];
}

@Module({})
class ConfluentKafkaConsumerRuntimeModule {}

@Module({})
export class ConfluentKafkaConsumerModule {
  static forRoot(options: KafkaConsumerModuleOptions): DynamicModule {
    return {
      module: ConfluentKafkaConsumerRuntimeModule,
      providers: [
        { provide: KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN, useValue: options },
        MetadataScanner,
        ConfluentKafkaConsumerExplorer,
        ConfluentKafkaConsumerRunner,
      ],
    };
  }

  static forRootAsync(asyncOptions: KafkaConsumerModuleAsyncOptions): DynamicModule {
    const { useFactory, inject, imports } = asyncOptions;
    return {
      module: ConfluentKafkaConsumerRuntimeModule,
      imports: imports ?? [],
      providers: [
        MetadataScanner,
        {
          provide: KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN,
          useFactory,
          inject: inject as FactoryProvider["inject"],
        },
        ConfluentKafkaConsumerExplorer,
        ConfluentKafkaConsumerRunner,
      ],
    };
  }
}
