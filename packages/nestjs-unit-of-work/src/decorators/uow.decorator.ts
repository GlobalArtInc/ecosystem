import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { IsolationLevel } from '../enums/uow.enums';
import { UnitOfWorkInterceptor } from '../interceptors/uow.interceptor';

export const UOW_METADATA_KEY = 'UOW_METADATA_KEY';

export interface UowOptions {
  isolationLevel?: IsolationLevel;
}

export const UOW = (options?: UowOptions) => applyDecorators(
  SetMetadata(UOW_METADATA_KEY, options), 
  UseInterceptors(UnitOfWorkInterceptor)
);

