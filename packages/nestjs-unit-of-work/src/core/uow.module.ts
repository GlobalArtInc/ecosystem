import { DynamicModule, Module, Global } from "@nestjs/common";
import { UnitOfWorkManager } from "./uow.service";
import { UnitOfWorkContext } from "./uow.context";
import { UnitOfWorkInterceptor } from "../interceptors/uow.interceptor";

const providers = [
  UnitOfWorkManager,
  UnitOfWorkContext,
  UnitOfWorkInterceptor
]

@Global()
@Module({})
export class UnitOfWorkModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: UnitOfWorkModule,
      providers,
      exports: [...providers],
    }
  }
}
