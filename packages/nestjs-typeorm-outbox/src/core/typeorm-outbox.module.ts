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
import { ScheduleModule } from "@nestjs/schedule";
import { ClientProxyFactory } from "@nestjs/microservices";
import { TypeormOutboxCronService } from "./typeorm-outbox-cron.service";

@Module({})
export class TypeormOutboxModule {
  private static createServiceProvider(): Provider {
    return {
      provide: TYPEORM_OUTBOX_SERVICE_TOKEN,
      useClass: TypeormOutboxService,
    };
  }

  private static createBrokerProvider(useValue: unknown = null): Provider {
    return {
      provide: TYPEORM_OUTBOX_BROKER_TOKEN,
      useValue,
    };
  }

  private static createTypeOrmFeature(connectionName?: string) {
    return TypeOrmModule.forFeature(
      [TypeormOutboxEntity],
      connectionName || "default",
    );
  }

  private static createModuleConfigProvider(
    options: TypeormOutboxModuleOptions,
  ): Provider {
    return {
      provide: TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN,
      useValue: {
        ...new TypeormOutboxModuleOptions(),
        ...options,
      },
    };
  }

  private static createAsyncModuleConfigProvider(
    options: TypeormOutboxModuleAsyncOptions,
  ): Provider {
    return {
      provide: TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = (await options.useFactory?.(...args)) as
          | TypeormOutboxModuleOptions;
  
        return {
          ...new TypeormOutboxModuleOptions(),
          ...moduleOptions,
        };
      },
      inject: options.inject || [],
    };
  }

  private static createCronConfigProvider(
    options: TypeormOutboxRegisterCronAsyncOptions,
  ): Provider {
    return {
      provide: TYPEORM_OUTBOX_CRON_CONFIG_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = await options.useFactory?.(...args);
        return {
          ...new TypeormOutboxRegisterCronModuleOptions(),
          ...moduleOptions,
        };
      },
      inject: options.inject || [],
    };
  }

  private static createCronBrokerProvider(
    options: TypeormOutboxRegisterCronAsyncOptions,
  ): Provider {
    return {
      provide: TYPEORM_OUTBOX_BROKER_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = await options.useFactory?.(...args);
        const config = {
          ...new TypeormOutboxRegisterCronModuleOptions(),
          ...moduleOptions,
        };
        return ClientProxyFactory.create(config?.kafkaConfig ?? {});
      },
      inject: options.inject || [],
    };
  }

  static forRoot(options: TypeormOutboxModuleOptions = {}): DynamicModule {
    const configProvider = this.createModuleConfigProvider(options);
    const serviceProvider = this.createServiceProvider();
    const brokerProvider = this.createBrokerProvider();

    return {
      module: TypeormOutboxModule,
      global: true,
      imports: [this.createTypeOrmFeature(options.typeOrmConnectionName)],
      providers: [configProvider, serviceProvider, brokerProvider],
      exports: [configProvider, serviceProvider, brokerProvider],
    };
  }

  static forRootAsync(
    options: TypeormOutboxModuleAsyncOptions,
  ): DynamicModule {
    const configProvider = this.createAsyncModuleConfigProvider(options);
    const serviceProvider = this.createServiceProvider();
    const brokerProvider = this.createBrokerProvider();

    return {
      module: TypeormOutboxModule,
      global: true,
      imports: [this.createTypeOrmFeature()],
      providers: [configProvider, serviceProvider, brokerProvider],
      exports: [configProvider, serviceProvider, brokerProvider],
    };
  }

  static registerCronAsync(
    options: TypeormOutboxRegisterCronAsyncOptions,
  ): DynamicModule {
    const configProvider = this.createCronConfigProvider(options);
    const brokerProvider = this.createCronBrokerProvider(options);
    const serviceProvider = this.createServiceProvider();

    return {
      module: TypeormOutboxModule,
      global: true,
      imports: [
        ScheduleModule.forRoot(),
        this.createTypeOrmFeature(),
      ],
      providers: [
        TypeormOutboxCronService,
        configProvider,
        brokerProvider,
        serviceProvider,
      ],
      exports: [configProvider, brokerProvider, serviceProvider],
    };
  }
}
