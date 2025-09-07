import { type IFilterBaseVisitor } from './filter-specification-visitor.base';
import { CompositeSpecification } from '../specification';
import { type Result } from 'oxide.ts';

export abstract class BaseFilterSpecification<E = unknown, V = unknown> extends CompositeSpecification<
  E,
  IFilterBaseVisitor
> {
  constructor(
    public readonly field: string,
    public readonly value: V,
    public readonly relation?: string,
  ) {
    super();
  }

  mutate(t: E): Result<E, string> {
    throw new Error('Method not implemented.');
  }
}
