import { KafkaOptions } from "@nestjs/microservices";
import { InjectionToken, ModuleMetadata, Type } from "@nestjs/common";
import { CronExpression } from "./typeorm-outbox.enums";

export class TypeormOutboxRegisterCronModuleOptions {
  typeOrmConnectionName?: string = "default";
  kafkaConfig?: KafkaOptions = {};
  cronExpression?: string = CronExpression.EVERY_10_SECONDS;
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
