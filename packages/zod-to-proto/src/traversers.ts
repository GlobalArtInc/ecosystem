import * as inflection from "inflection";
import {
  ZodArray,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodEnum,
  ZodMap,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodSet,
  ZodString,
  ZodTuple,
  ZodType,
  type ZodTypeAny,
} from "zod";
import { UnsupportedTypeException, type ProtobufField } from "./types";
import { getNumberTypeName, toPascalCase, protobufFieldToType } from "./utils";

export const traverseArray = ({
  key,
  value,
  messages,
  enums,
  typePrefix,
}: {
  key: string;
  value: ZodArray<ZodTypeAny> | ZodSet<ZodTypeAny>;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
}): ProtobufField[] => {
  const nestedValue =
    value instanceof ZodArray
      ? value.element
      : value instanceof ZodSet
        ? (value._def as { valueType: ZodTypeAny }).valueType
        : // @ts-expect-error
          (value._def as { element?: ZodTypeAny }).element;

  const singularKey = inflection.singularize(key);
  const elementFields = traverseKey({
    key: singularKey,
    value: nestedValue,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
  });
  return elementFields.map((field) => ({
    ...field,
    types: ["repeated", ...field.types],
    name: field.name.replace(singularKey, key),
  }));
};

export const traverseMap = ({
  key,
  value,
  messages,
  enums,
  typePrefix,
}: {
  key: string;
  value: ZodMap<ZodTypeAny, ZodTypeAny>;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
}): ProtobufField[] => {
  const mapDef = (value._def || value.def) as {
    keyType?: ZodTypeAny;
    valueType?: ZodTypeAny;
  };

  const keyType = traverseKey({
    key: inflection.singularize(key),
    value:
      mapDef.keyType ||
      (value as ZodTypeAny & { keyType?: ZodTypeAny }).keyType,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
  });
  const valueType = traverseKey({
    key: inflection.singularize(key),
    value:
      mapDef.valueType ||
      (value as ZodTypeAny & { valueType?: ZodTypeAny }).valueType,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
  });

  if (!keyType[0] || keyType.length !== 1) {
    throw new UnsupportedTypeException(`${key} map key`);
  }

  if (!valueType[0] || valueType.length !== 1) {
    throw new UnsupportedTypeException(`${key} map value`);
  }

  const mapType = `map<${protobufFieldToType({ field: keyType[0] })}, ${protobufFieldToType({ field: valueType[0] })}>`;
  return [
    {
      types: [mapType],
      name: key,
    },
  ];
};

export const traverseKey = ({
  key,
  value,
  messages,
  enums,
  isOptional,
  isInArray,
  typePrefix,
}: {
  key: string;
  value: unknown;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  isOptional: boolean;
  isInArray: boolean;
  typePrefix: string | null;
}): ProtobufField[] => {
  if (!value) {
    return [];
  }

  if (value instanceof ZodOptional || value instanceof ZodNullable) {
    return traverseKey({
      key,
      value: value.unwrap(),
      messages,
      enums,
      isOptional: true,
      isInArray,
      typePrefix,
    });
  }

  if (value instanceof ZodArray || value instanceof ZodSet) {
    return traverseArray({
      key,
      value: value as ZodArray<ZodTypeAny> | ZodSet<ZodTypeAny>,
      messages,
      enums,
      typePrefix,
    });
  }

  if (value instanceof ZodMap) {
    return traverseMap({
      key,
      value: value as ZodMap<ZodTypeAny, ZodTypeAny>,
      messages,
      enums,
      typePrefix,
    });
  }

  const optional = isOptional && !isInArray ? "optional" : null;

  if (value instanceof ZodObject) {
    let messageName = toPascalCase({ value: key });
    if (typePrefix) {
      messageName = `${typePrefix}${messageName}`;
    }
    const nestedMessageFields = traverseSchema({
      schema: value,
      messages,
      enums,
      typePrefix,
    });
    messages.set(messageName, nestedMessageFields);
    return [
      {
        types: [optional, messageName],
        name: key,
      },
    ];
  }

  if (value instanceof ZodString) {
    return [
      {
        types: [optional, "string"],
        name: key,
      },
    ];
  }

  if (value instanceof ZodNumber) {
    const typeName = getNumberTypeName({ value });
    return [
      {
        types: [optional, typeName],
        name: key,
      },
    ];
  }

  if (value instanceof ZodBoolean) {
    return [
      {
        types: [optional, "bool"],
        name: key,
      },
    ];
  }

  if (value instanceof ZodEnum) {
    const enumFields = value.options
      .map(
        (option: string | number, index: number) =>
          `    ${String(option)} = ${index};`
      )
      .join("\n");
    let enumName = toPascalCase({ value: key });
    if (typePrefix) {
      enumName = `${typePrefix}${enumName}`;
    }
    enums.set(enumName, [`enum ${enumName} {\n${enumFields}\n}`]);
    return [
      {
        types: [optional, enumName],
        name: key,
      },
    ];
  }

  if (value instanceof ZodDate) {
    return [
      {
        types: [optional, "string"],
        name: key,
      },
    ];
  }

  if (value instanceof ZodBigInt) {
    return [
      {
        types: [optional, "int64"],
        name: key,
      },
    ];
  }

  if (value instanceof ZodTuple) {
    const tupleFields: ProtobufField[] = (
      value._def.items as ZodTypeAny[]
    ).flatMap((item: ZodTypeAny, index: number) => {
      return traverseKey({
        key: `${key}_${index}`,
        value: item,
        messages,
        enums,
        isOptional: false,
        isInArray,
        typePrefix,
      });
    });

    const tupleMessageName = toPascalCase({ value: key });
    messages.set(
      tupleMessageName,
      tupleFields.map(
        (field, index) =>
          `  ${field.types.join(" ")} ${field.name} = ${index + 1};`
      )
    );
    return [
      {
        types: [optional, tupleMessageName],
        name: key,
      },
    ];
  }

  if (value instanceof ZodType) {
    throw new UnsupportedTypeException(value.constructor.name);
  }

  throw new UnsupportedTypeException(typeof value);
};

export const traverseSchema = ({
  schema,
  messages,
  enums,
  typePrefix,
}: {
  schema: ZodTypeAny;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
}): string[] => {
  if (
    !schema ||
    typeof schema !== "object" ||
    !("_def" in schema) ||
    (schema.constructor.name !== "ZodObject" &&
      (schema._def as { type?: string }).type !== "object")
  ) {
    throw new UnsupportedTypeException(
      schema?.constructor?.name || typeof schema
    );
  }

  const zodObject = schema as ZodObject<any>;
  const fields = Object.entries(zodObject.shape).flatMap(([key, value]) => {
    return traverseKey({
      key,
      value,
      messages,
      enums,
      isOptional: false,
      isInArray: false,
      typePrefix,
    });
  });

  return fields.map(
    (field, index) =>
      `${protobufFieldToType({ field })} ${field.name} = ${index + 1};`
  );
};
