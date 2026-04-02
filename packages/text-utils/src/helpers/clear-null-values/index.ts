type NullLike = null | 'null';

const isNullLike = (value: unknown): value is NullLike =>
  value === null || value === 'null';

const clearNullValues = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (!isNullLike(value)) {
      acc[key as keyof T] = value as T[keyof T];
    }

    return acc;
  }, {} as Partial<T>);
};

export { clearNullValues };
