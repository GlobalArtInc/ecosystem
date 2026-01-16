import 'reflect-metadata';
import { TEMPORAL_ARGS_METADATA } from '../temporal.constants';

export const createTemporalParamDecorator = (paramtype: number) => {
  return (data?: any): ParameterDecorator => (target, key, index) => {
    const args = Reflect.getMetadata(TEMPORAL_ARGS_METADATA, target, key) || {};
    args[index] = {
      index,
      data,
      type: paramtype,
    };
    Reflect.defineMetadata(TEMPORAL_ARGS_METADATA, args, target, key);
  };
};

