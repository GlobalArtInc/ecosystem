import { TemporalParamType } from '../temporal-enums';
import { createTemporalParamDecorator } from './params.utils';

export function Payload(property?: string): ParameterDecorator {
  return createTemporalParamDecorator(TemporalParamType.PAYLOAD)(property);
}

