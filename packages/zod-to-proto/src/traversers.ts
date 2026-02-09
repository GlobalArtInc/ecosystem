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
  ZodRecord,
  ZodSet,
  ZodString,
  ZodTuple,
  ZodType,
  type ZodTypeAny,
} from "zod";
import {
  ZodArrayDefinition,
  ZodMapDefinition,
  ZodRecordDefinition,
  type ProtobufField,
} from "./types";
import { getNumberTypeName, toPascalCase, protobufFieldToType } from "./utils";

/**
 * Traverses a Zod array or set schema and converts it to protobuf repeated fields.
 * Handles nested types and generates appropriate field definitions.
 *
 * @param key - Field name
 * @param value - Zod array or set schema
 * @param messages - Map of message names to their protobuf fields
 * @param enums - Map of enum names to their protobuf values
 * @param typePrefix - Optional prefix for type names
 * @param parentKey - Optional parent message name for nested types
 * @returns Array of protobuf field definitions
 */
export const traverseArray = ({
  key,
  value,
  messages,
  enums,
  typePrefix,
  parentKey,
}: {
  key: string;
  value: ZodArray<ZodTypeAny> | ZodSet<ZodTypeAny>;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
  parentKey?: string;
}): ProtobufField[] => {
  const nestedValue =
    value instanceof ZodArray
      ? value.element
      : value instanceof ZodSet
        ? (value.def as unknown as ZodArrayDefinition).valueType
        : // @ts-expect-error
          (value.def as unknown as ZodArrayDefinition).element;

  const singularKey = inflection.singularize(key);
  const elementFields = traverseKey({
    key: singularKey,
    value: nestedValue,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
    parentKey: nestedValue instanceof ZodObject ? parentKey : undefined,
  });
  return elementFields.map((field) => ({
    ...field,
    types: ["repeated", ...field.types],
    name: field.name.replace(singularKey, key),
  }));
};

/**
 * Traverses a Zod map schema and converts it to a protobuf map type.
 * Validates that both key and value types are simple types suitable for map keys/values.
 *
 * @param key - Field name
 * @param value - Zod map schema
 * @param messages - Map of message names to their protobuf fields
 * @param enums - Map of enum names to their protobuf values
 * @param typePrefix - Optional prefix for type names
 * @param parentKey - Optional parent message name for nested types
 * @returns Array containing a single protobuf map field definition, or empty array if invalid
 */
export const traverseMap = ({
  key,
  value,
  messages,
  enums,
  typePrefix,
  parentKey,
}: {
  key: string;
  value: ZodMap<ZodTypeAny, ZodTypeAny>;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
  parentKey?: string;
}): ProtobufField[] => {
  const mapDef = value.def as ZodMapDefinition;

  const keyType = traverseKey({
    key: inflection.singularize(key),
    value: mapDef.keyType,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
    parentKey,
  });
  const valueType = traverseKey({
    key: inflection.singularize(key),
    value: mapDef.valueType,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
    parentKey,
  });

  if (!keyType[0] || keyType.length !== 1) {
    return [];
  }

  if (!valueType[0] || valueType.length !== 1) {
    return [];
  }

  const mapType = `map<${protobufFieldToType({ field: keyType[0] })}, ${protobufFieldToType({ field: valueType[0] })}>`;
  return [
    {
      types: [mapType],
      name: key,
    },
  ];
};

/**
 * Traverses a Zod record schema and converts it to a protobuf map type.
 * Similar to traverseMap but handles ZodRecord type.
 *
 * @param key - Field name
 * @param value - Zod record schema
 * @param messages - Map of message names to their protobuf fields
 * @param enums - Map of enum names to their protobuf values
 * @param typePrefix - Optional prefix for type names
 * @param parentKey - Optional parent message name for nested types
 * @returns Array containing a single protobuf map field definition, or empty array if invalid
 */
export const traverseRecord = ({
  key,
  value,
  messages,
  enums,
  typePrefix,
  parentKey,
}: {
  key: string;
  value: ZodRecord;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
  parentKey?: string;
}): ProtobufField[] => {
  const recordDef = value.def as unknown as ZodRecordDefinition;

  const keyType = traverseKey({
    key: inflection.singularize(key),
    value: recordDef.keyType,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
    parentKey,
  });
  const valueType = traverseKey({
    key: inflection.singularize(key),
    value: recordDef.valueType,
    messages,
    enums,
    isOptional: false,
    isInArray: true,
    typePrefix,
    parentKey,
  });

  if (!keyType[0] || keyType.length !== 1) {
    return [];
  }

  if (!valueType[0] || valueType.length !== 1) {
    return [];
  }

  const mapType = `map<${protobufFieldToType({ field: keyType[0] })}, ${protobufFieldToType({ field: valueType[0] })}>`;
  return [
    {
      types: [mapType],
      name: key,
    },
  ];
};

/**
 * Traverses a single key-value pair from a Zod schema and converts it to protobuf field definitions.
 * Handles various Zod types including primitives, objects, arrays, maps, enums, tuples, and optional/nullable fields.
 *
 * @param key - Field name
 * @param value - Zod schema value
 * @param messages - Map of message names to their protobuf fields
 * @param enums - Map of enum names to their protobuf values
 * @param isOptional - Whether the field is optional
 * @param isInArray - Whether the field is inside an array
 * @param typePrefix - Optional prefix for type names
 * @param parentKey - Optional parent message name for nested types
 * @returns Array of protobuf field definitions
 */
export const traverseKey = ({
  key,
  value,
  messages,
  enums,
  isOptional,
  isInArray,
  typePrefix,
  parentKey,
}: {
  key: string;
  value: unknown;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  isOptional: boolean;
  isInArray: boolean;
  typePrefix: string | null;
  parentKey?: string;
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
      parentKey,
    });
  }

  if (value instanceof ZodArray || value instanceof ZodSet) {
    return traverseArray({
      key,
      value: value as ZodArray<ZodTypeAny> | ZodSet<ZodTypeAny>,
      messages,
      enums,
      typePrefix,
      parentKey,
    });
  }

  if (value instanceof ZodMap) {
    return traverseMap({
      key,
      value: value as ZodMap<ZodTypeAny, ZodTypeAny>,
      messages,
      enums,
      typePrefix,
      parentKey,
    });
  }

  if (value instanceof ZodRecord) {
    return traverseRecord({
      key,
      value: value as ZodRecord,
      messages,
      enums,
      typePrefix,
      parentKey,
    });
  }

  const optional = isOptional && !isInArray ? "optional" : null;

  if (value instanceof ZodObject) {
    let messageName = toPascalCase({ value: key });
    if (parentKey) {
      const isParentAlreadyPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(parentKey);
      if (isParentAlreadyPascalCase) {
        messageName = `${parentKey}${messageName}`;
      } else {
        const parentMessageName = toPascalCase({ value: parentKey });
        messageName = `${parentMessageName}${messageName}`;
      }
    }
    if (typePrefix) {
      messageName = `${typePrefix}${messageName}`;
    }
    const nestedMessageFields = traverseSchema({
      schema: value,
      messages,
      enums,
      typePrefix,
      parentKey: messageName,
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
          `    ${String(option)} = ${index};`,
      )
      .join("\n");
    let enumName = toPascalCase({ value: key });
    if (parentKey) {
      const isParentAlreadyPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(parentKey);
      if (isParentAlreadyPascalCase) {
        enumName = `${parentKey}${enumName}`;
      } else {
        const parentMessageName = toPascalCase({ value: parentKey });
        enumName = `${parentMessageName}${enumName}`;
      }
    }
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

  if (value instanceof ZodType) {
    const def = value.def as {
      type?: string;
      check?: unknown;
      fn?: (data: unknown) => boolean;
    };
    if (def.type === "custom" && def.check === "custom" && def.fn) {
      try {
        if (
          (typeof Buffer !== "undefined" && def.fn(Buffer.alloc(0))) ||
          (typeof Uint8Array !== "undefined" && def.fn(new Uint8Array(0)))
        ) {
          return [
            {
              types: [optional, "bytes"],
              name: key,
            },
          ];
        }
      } catch {}
    }
  }

  if (value instanceof ZodTuple) {
    const tupleFields: ProtobufField[] = (
      value.def.items as ZodTypeAny[]
    ).flatMap((item: ZodTypeAny, index: number) => {
      return traverseKey({
        key: `${key}_${index}`,
        value: item,
        messages,
        enums,
        isOptional: false,
        isInArray,
        typePrefix,
        parentKey,
      });
    });

    let tupleMessageName = toPascalCase({ value: key });
    if (parentKey) {
      const isParentAlreadyPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(parentKey);
      if (isParentAlreadyPascalCase) {
        tupleMessageName = `${parentKey}${tupleMessageName}`;
      } else {
        const parentMessageName = toPascalCase({ value: parentKey });
        tupleMessageName = `${parentMessageName}${tupleMessageName}`;
      }
    }
    if (typePrefix) {
      tupleMessageName = `${typePrefix}${tupleMessageName}`;
    }
    messages.set(
      tupleMessageName,
      tupleFields.map(
        (field, index) =>
          `  ${field.types.join(" ")} ${field.name} = ${index + 1};`,
      ),
    );
    return [
      {
        types: [optional, tupleMessageName],
        name: key,
      },
    ];
  }

  if (value instanceof ZodType) {
    return [];
  }

  return [];
};

/**
 * Traverses a Zod object schema and converts it to protobuf message field definitions.
 * Processes all fields in the schema and generates appropriate protobuf types.
 *
 * @param schema - Zod schema to traverse
 * @param messages - Map of message names to their protobuf fields
 * @param enums - Map of enum names to their protobuf values
 * @param typePrefix - Optional prefix for type names
 * @param parentKey - Optional parent message name for nested types
 * @returns Array of protobuf field definition strings
 */
export const traverseSchema = ({
  schema,
  messages,
  enums,
  typePrefix,
  parentKey,
}: {
  schema: ZodTypeAny;
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
  parentKey?: string;
}): string[] => {
  if (
    !schema ||
    typeof schema !== "object" ||
    !("def" in schema) ||
    (schema.constructor.name !== "ZodObject" &&
      (schema.def as { type?: string }).type !== "object")
  ) {
    return [];
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
      parentKey,
    });
  });

  return fields.map(
    (field, index) =>
      `${protobufFieldToType({ field })} ${field.name} = ${index + 1};`,
  );
};
