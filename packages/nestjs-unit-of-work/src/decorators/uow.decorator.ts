import { IsolationLevel } from "../enums/uow.enums";
import { UnitOfWorkManager } from "../core/uow.service";

export const UOW_METADATA_KEY = "UOW_METADATA_KEY";

export interface UowOptions {
  isolationLevel?: IsolationLevel;
}

function resolveUnitOfWorkManager(instance: object): UnitOfWorkManager {
  const target = instance as Record<string, unknown>;

  const candidates = [instance, ...Object.values(target)];

  for (const candidate of candidates) {
    if (candidate instanceof UnitOfWorkManager) return candidate;
  }

  throw new Error(
    '@UOW requires UnitOfWorkManager. Inject it in the constructor: "private readonly unitOfWorkManager: UnitOfWorkManager"',
  );
}

export const UOW =
  (options?: UowOptions): MethodDecorator =>
  (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (this: object, ...args: unknown[]) {
      const manager = resolveUnitOfWorkManager(this);
      return manager.runInTransaction(
        () => original.apply(this, args),
        options?.isolationLevel,
      );
    };

    return descriptor;
  };
