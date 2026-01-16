import { TemporalParamType } from '../temporal-enums';
import { createTemporalParamDecorator } from './params.utils';

export function Context(): ParameterDecorator {
  return createTemporalParamDecorator(TemporalParamType.CONTEXT)();
}

