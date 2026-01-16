import { ParamData } from '@nestjs/common';
import { ParamsFactory } from '@nestjs/core/helpers/external-context-creator';
import { TemporalParamType } from './temporal-enums';
import { TemporalExecutionContext } from './temporal-execution-context';

export class TemporalParamsFactory implements ParamsFactory {
  constructor(
    private readonly instance: object,
    private readonly handler: Function,
  ) {}

  exchangeKeyForValue(
    type: number,
    data: ParamData,
    args: unknown[],
  ): unknown {
    switch (type) {
      case TemporalParamType.PAYLOAD:
        return data && args[0] && typeof args[0] === 'object'
          ? (args[0] as Record<string, unknown>)[data as string]
          : args[0];

      case TemporalParamType.CONTEXT:
        return new TemporalExecutionContext(this.instance, this.handler, args);

      default:
        return null;
    }
  }
}

