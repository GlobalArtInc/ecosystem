import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, lastValueFrom } from 'rxjs';
import { UOW_METADATA_KEY, UowOptions } from '../decorators/uow.decorator';
import { UnitOfWorkManager } from '../core/uow.service';

@Injectable()
export class UnitOfWorkInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly uowManager: UnitOfWorkManager,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const uowMetadata = this.reflector.getAllAndOverride<UowOptions>(
      UOW_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!uowMetadata) {
      return next.handle();
    }

    return from(
      this.uowManager.runInTransaction(async () => {
        return await lastValueFrom(next.handle());
      }, uowMetadata.isolationLevel),
    );
  }
}

