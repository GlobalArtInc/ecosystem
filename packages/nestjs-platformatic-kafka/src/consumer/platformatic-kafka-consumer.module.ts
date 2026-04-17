import {
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';
import { KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN } from "../constants/platformatic-kafka.constants";
import { PlatformaticKafkaConsumerExplorer } from "./platformatic-kafka-consumer.explorer";
import { PlatformaticKafkaConsumerRunner } from "./platformatic-kafka-consumer.runner";
import type { PlatformaticKafkaOptions } from "../types/platformatic-kafka.types";

export type KafkaConsumerModuleOptions = PlatformaticKafkaOptions;

export interface KafkaConsumerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: unknown[]) => PlatformaticKafkaOptions | Promise<PlatformaticKafkaOptions>;
  inject?: InjectionToken[];
}

@Module({})
class PlatformaticKafkaConsumerRuntimeModule {}

@Module({})
export class PlatformaticKafkaConsumerModule {
  static forRoot(options: KafkaConsumerModuleOptions): DynamicModule {
    return {
      module: PlatformaticKafkaConsumerRuntimeModule,
      providers: [
        { provide: KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN, useValue: options },
        MetadataScanner,
        PlatformaticKafkaConsumerExplorer,
        PlatformaticKafkaConsumerRunner,
      ],
    };
  }

  static forRootAsync(asyncOptions: KafkaConsumerModuleAsyncOptions): DynamicModule {
    const { useFactory, inject, imports } = asyncOptions;
    return {
      module: PlatformaticKafkaConsumerRuntimeModule,
      imports: imports ?? [],
      providers: [
        MetadataScanner,
        {
          provide: KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN,
          useFactory,
          inject: inject as FactoryProvider['inject'],
        },
        PlatformaticKafkaConsumerExplorer,
        PlatformaticKafkaConsumerRunner,
      ],
    };
  }
}
