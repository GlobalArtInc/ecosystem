import { IsolationLevel } from "../enums/uow.enums";
import { getUnitOfWorkManager } from "../core/uow.service";

export const UOW_METADATA_KEY = "UOW_METADATA_KEY";

export interface UowOptions {
  isolationLevel?: IsolationLevel;
}

export const UOW =
  (options?: UowOptions): MethodDecorator =>
  (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (this: object, ...args: unknown[]) {
      const manager = getUnitOfWorkManager();
      return manager.runInTransaction(
        () => original.apply(this, args),
        options?.isolationLevel,
      );
    };

    return descriptor;
  };
