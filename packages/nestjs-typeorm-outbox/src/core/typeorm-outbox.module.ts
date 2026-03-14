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
import { ClientProxyFactory } from "@nestjs/microservices";
import { TypeormOutboxCronService } from "./typeorm-outbox-cron.service";

const serviceProvider = (): Provider => ({
  provide: TYPEORM_OUTBOX_SERVICE_TOKEN,
  useClass: TypeormOutboxService,
});

const brokerProvider = (useValue: any = {}): Provider => ({
  provide: TYPEORM_OUTBOX_BROKER_TOKEN,
  useValue,
});

const typeOrmFeature = (connectionName = "default") =>
  TypeOrmModule.forFeature([TypeormOutboxEntity], connectionName);

const mergeModuleOptions = <T extends object>(
  defaults: new () => T,
  overrides?: Partial<T>,
): T => ({ ...new defaults(), ...overrides });

const moduleConfigProvider = (
  options: TypeormOutboxModuleOptions,
): Provider => ({
  provide: TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN,
  useValue: mergeModuleOptions(TypeormOutboxModuleOptions, options),
});

const asyncModuleConfigProvider = (
  options: TypeormOutboxModuleAsyncOptions,
): Provider => ({
  provide: TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN,
  useFactory: async (...args: any[]) =>
    mergeModuleOptions(
      TypeormOutboxModuleOptions,
      await options.useFactory?.(...args),
    ),
  inject: options.inject || [],
});

const cronConfigProvider = (
  options: TypeormOutboxRegisterCronAsyncOptions,
): Provider => ({
  provide: TYPEORM_OUTBOX_CRON_CONFIG_TOKEN,
  useFactory: async (...args: any[]) =>
    mergeModuleOptions(
      TypeormOutboxRegisterCronModuleOptions,
      await options.useFactory?.(...args),
    ),
  inject: options.inject || [],
});

const cronBrokerProvider = (
  options: TypeormOutboxRegisterCronAsyncOptions,
): Provider => ({
  provide: TYPEORM_OUTBOX_BROKER_TOKEN,
  useFactory: async (...args: any[]) => {
    const config = mergeModuleOptions(
      TypeormOutboxRegisterCronModuleOptions,
      await options.useFactory?.(...args),
    );
    return ClientProxyFactory.create(config?.brokerConfig ?? {});
  },
  inject: options.inject || [],
});

@Module({})
export class TypeormOutboxModule {
  static forRoot(options: TypeormOutboxModuleOptions = {}): DynamicModule {
    const providers = [
      moduleConfigProvider(options),
      serviceProvider(),
      brokerProvider(),
    ];
    return {
      module: TypeormOutboxModule,
      global: true,
      imports: [typeOrmFeature(options.typeOrmConnectionName)],
      providers,
      exports: providers,
    };
  }

  static forRootAsync(options: TypeormOutboxModuleAsyncOptions): DynamicModule {
    const providers = [
      asyncModuleConfigProvider(options),
      serviceProvider(),
      brokerProvider(),
    ];
    return {
      module: TypeormOutboxModule,
      global: true,
      imports: [typeOrmFeature()],
      providers,
      exports: providers,
    };
  }

  static registerCronAsync(
    options: TypeormOutboxRegisterCronAsyncOptions,
  ): DynamicModule {
    const providers = [
      cronConfigProvider(options),
      cronBrokerProvider(options),
      serviceProvider(),
    ];
    return {
      module: TypeormOutboxModule,
      global: true,
      imports: [typeOrmFeature()],
      providers: [TypeormOutboxCronService, ...providers],
      exports: providers,
    };
  }
}
