import { KafkaOptions, MqttOptions, NatsOptions } from "@nestjs/microservices";
import { InjectionToken, ModuleMetadata, Type } from "@nestjs/common";
import { CronExpression } from "./typeorm-outbox.enums";

type BrokerConfig = MqttOptions | NatsOptions | KafkaOptions;

export class TypeormOutboxRegisterCronModuleOptions {
  brokerConfig: BrokerConfig = {};
  typeOrmConnectionName?: string = "default";
  cronExpression?: string = CronExpression.EVERY_SECOND;
}

export interface TypeormOutboxRegisterCronAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  inject?: InjectionToken[];
  useExisting?: Type<TypeormOutboxRegisterCronModuleOptions>;
  useClass?: Type<TypeormOutboxRegisterCronModuleOptions>;
  useFactory?: (
    ...args: unknown[]
  ) =>
    | Promise<TypeormOutboxRegisterCronModuleOptions>
    | TypeormOutboxRegisterCronModuleOptions;
}

export class TypeormOutboxModuleOptions {
  typeOrmConnectionName?: string = "default";
}

export interface TypeormOutboxModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  inject?: InjectionToken[];
  useFactory?: (
    ...args: unknown[]
  ) => Promise<TypeormOutboxModuleOptions> | TypeormOutboxModuleOptions;
}
