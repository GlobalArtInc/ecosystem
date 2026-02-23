import {
  DynamicModule,
  Global,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { UnitOfWorkManager } from './uow.service';
import { UnitOfWorkContext } from './uow.context';
import { UnitOfWorkInterceptor } from '../interceptors/uow.interceptor';
import { patchTypeORMRepository } from './repository.patch';

const providers = [
  UnitOfWorkManager,
  UnitOfWorkContext,
  UnitOfWorkInterceptor,
];

@Global()
@Module({})
export class UnitOfWorkModule implements OnModuleInit {
  onModuleInit(): void {
    patchTypeORMRepository();
  }

  static forRoot(): DynamicModule {
    return {
      global: true,
      module: UnitOfWorkModule,
      providers,
      exports: providers,
    };
  }
}
