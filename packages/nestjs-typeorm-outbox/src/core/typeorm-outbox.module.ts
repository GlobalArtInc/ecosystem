import { TypeOrmModule } from "@nestjs/typeorm";
import { DynamicModule, Module, Provider } from "@nestjs/common";
import {
  TypeormOutboxRegisterCronAsyncOptions,
  TypeormOutboxRegisterCronModuleOptions,
  TypeormOutboxModuleOptions,
  TypeormOutboxModuleAsyncOptions,
} from "./typeorm-outbox.interfaces";
import {
  TYPEORM_OUTBOX_BROKER_TOKEN,
  TYPEORM_OUTBOX_CRON_CONFIG_TOKEN,
  TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN,
  TYPEORM_OUTBOX_SERVICE_TOKEN,
} from "./typeorm-outbox.di-tokens";
import { TypeormOutboxEntity } from "./typeorm-outbox.entity";
import { TypeormOutboxService } from "./typeorm-outbox.service";
import { TypeormOutboxController } from "./typeorm-outbox.controller";
import { ScheduleModule } from "@nestjs/schedule";
import { ClientProxyFactory } from "@nestjs/microservices";

@Module({})
export class TypeormOutboxModule {
  static forRoot(options: TypeormOutboxModuleOptions = {}): DynamicModule {
    const configProvider: Provider = {
      provide: TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN,
      useValue: options,
    };
    const serviceProvider: Provider = {
      provide: TYPEORM_OUTBOX_SERVICE_TOKEN,
      useClass: TypeormOutboxService,
    };
    const brokerProvider: Provider = {
      provide: TYPEORM_OUTBOX_BROKER_TOKEN,
      useValue: null,
    };

    return {
      module: TypeormOutboxModule,
      imports: [
        TypeOrmModule.forFeature(
          [TypeormOutboxEntity],
          options.typeOrmConnectionName,
        ),
      ],
      providers: [configProvider, serviceProvider, brokerProvider],
      exports: [configProvider, serviceProvider, brokerProvider],
    };
  }

  static forRootAsync(options: TypeormOutboxModuleAsyncOptions): DynamicModule {
    const configProvider: Provider = {
      provide: TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = options.useFactory?.(
          ...args,
        ) as TypeormOutboxModuleOptions;
        return moduleOptions;
      },
      inject: options.inject || [],
    };
    const serviceProvider: Provider = {
      provide: TYPEORM_OUTBOX_SERVICE_TOKEN,
      useClass: TypeormOutboxService,
    };
    const brokerProvider: Provider = {
      provide: TYPEORM_OUTBOX_BROKER_TOKEN,
      useValue: null,
    };

    return {
      module: TypeormOutboxModule,
      imports: [TypeOrmModule.forFeature([TypeormOutboxEntity], "default")],
      providers: [configProvider, serviceProvider, brokerProvider],
      exports: [configProvider, serviceProvider, brokerProvider],
    };
  }

  static registerCronAsync(
    options: TypeormOutboxRegisterCronAsyncOptions,
  ): DynamicModule {
    const configProvider: Provider = {
      provide: TYPEORM_OUTBOX_CRON_CONFIG_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = options.useFactory?.(
          ...args,
        ) as TypeormOutboxRegisterCronModuleOptions;
        return moduleOptions;
      },
      inject: options.inject || [],
    };

    const brokerProvider: Provider = {
      provide: TYPEORM_OUTBOX_BROKER_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = options?.useFactory?.(
          ...args,
        ) as TypeormOutboxRegisterCronModuleOptions;
        return ClientProxyFactory.create(moduleOptions?.kafkaConfig ?? {});
      },
      inject: options.inject || [],
    };
    const serviceProvider: Provider = {
      provide: TYPEORM_OUTBOX_SERVICE_TOKEN,
      useClass: TypeormOutboxService,
    };

    return {
      module: TypeormOutboxModule,
      imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([TypeormOutboxEntity], "default")
      ],
      controllers: [TypeormOutboxController],
      providers: [configProvider, brokerProvider, serviceProvider],
      exports: [configProvider, brokerProvider, serviceProvider],
    };
  }
}
