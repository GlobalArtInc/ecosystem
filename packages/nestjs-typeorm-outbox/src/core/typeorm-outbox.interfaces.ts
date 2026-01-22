import { KafkaOptions } from "@nestjs/microservices";
import { InjectionToken, ModuleMetadata, Type } from "@nestjs/common";

// register cron options
export class TypeormOutboxRegisterCronModuleOptions {
  typeOrmConnectionName?: string = "default";
  kafkaConfig?: KafkaOptions = {};
}
export interface TypeormOutboxRegisterCronAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  inject?: any[];
  useExisting?: Type<TypeormOutboxRegisterCronModuleOptions>;
  useClass?: Type<TypeormOutboxRegisterCronModuleOptions>;
  useFactory?: (
    ...args: any[]
  ) =>
    | Promise<TypeormOutboxRegisterCronModuleOptions>
    | TypeormOutboxRegisterCronModuleOptions;
}

// register module options
export class TypeormOutboxModuleOptions {
  typeOrmConnectionName?: string = "default";
}
export class TypeormOutboxModuleAsyncOptions {
  imports?: Type[] = [];
  inject?: InjectionToken[] = [];
  useFactory?: (
    ...args: any[]
  ) => Promise<TypeormOutboxModuleOptions> | TypeormOutboxModuleOptions;
}
