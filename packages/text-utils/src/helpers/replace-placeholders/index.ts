type Replacements = { [key: string]: string | number };

/**
 * Replace placeholder in object
 * @param obj
 * @param replacements
 * @returns
 */
const replacePlaceholdersInObject = (obj: unknown, replacements: Record<string, unknown>): unknown => {
  if (typeof obj === 'string') {
    const replacedValue = obj.replace(/{{(.*?)}}/g, (_, key) =>
      replacements[key] !== undefined && replacements[key] !== null ? String(replacements[key]) : _,
    );

    return !isNaN(replacedValue as unknown as number) ? Math.floor(parseFloat(replacedValue)) : replacedValue;
  }

  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const result: Record<string, unknown> = {};
    Object.entries(obj).forEach(([key, value]) => {
      result[key] = replacePlaceholdersInObject(value, replacements);
    });

    return result;
  }

  return obj;
};

/**
 * Replace placeholder in object with flatter replacements
 * @param value
 * @param replacements
 * @returns
 */
const replacePlaceholdersInObjectWithFlatten = (value: string, replacements: unknown) => {
  const flattenVariables = (obj: any, prefix = ''): Record<string, unknown> => {
    return Object.keys(obj).reduce(
      (acc, k) => {
        const pre = prefix.length ? `${prefix}.` : '';
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          Object.assign(acc, flattenVariables(obj[k] as Record<string, unknown>, `${pre}${k}`));
        } else {
          acc[`${pre}${k}`] = obj[k];
        }

        return acc;
      },
      {} as Record<string, unknown>,
    );
  };

  if (replacements) {
    const flatVariables = flattenVariables(replacements);
    Object.keys(flatVariables).forEach((variable) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      value = value.replace(regex, String(flatVariables[variable]));
    });
  }

  return value;
};

/**
 * Replace placeholder in the string
 */
const replacePlaceholdersInString = (value: string, replacements: Record<string, unknown>) => {
  return value.replace(/{{(.*?)}}/g, (_, key) => 
    replacements[key] !== undefined && replacements[key] !== null ? String(replacements[key]) : _
  );
};

export { replacePlaceholdersInObject, replacePlaceholdersInObjectWithFlatten, replacePlaceholdersInString }