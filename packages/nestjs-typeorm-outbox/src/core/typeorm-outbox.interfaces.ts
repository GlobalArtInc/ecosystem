import {
  type CustomClientOptions,
  KafkaOptions,
  MqttOptions,
  NatsOptions,
} from "@nestjs/microservices";
import { InjectionToken, ModuleMetadata, Type } from "@nestjs/common";
import { CronExpression } from "./typeorm-outbox.enums";

export type CustomMicroserviceBrokerConfig = {
  strategy: unknown;
};

type BrokerConfig =
  | MqttOptions
  | NatsOptions
  | KafkaOptions
  | CustomMicroserviceBrokerConfig
  | CustomClientOptions;

export class TypeormOutboxRegisterCronModuleOptions {
  brokerConfig: BrokerConfig = {};
  deleteItem?: boolean = true;
  typeOrmConnectionName?: string = "default";
  cronExpression?: string = CronExpression.EVERY_SECOND;
}

export interface TypeormOutboxRegisterCronAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  inject?: InjectionToken[];
  useExisting?: Type<TypeormOutboxRegisterCronModuleOptions>;
  useClass?: Type<TypeormOutboxRegisterCronModuleOptions>;
  useFactory?: (
    ...args: any[]
  ) =>
    | Promise<TypeormOutboxRegisterCronModuleOptions>
    | TypeormOutboxRegisterCronModuleOptions;
}

export class TypeormOutboxModuleOptions {
  typeOrmConnectionName?: string = "default";
}

export interface TypeormOutboxModuleAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  inject?: InjectionToken[];
  useFactory?: (
    ...args: any[]
  ) => Promise<TypeormOutboxModuleOptions> | TypeormOutboxModuleOptions;
}
