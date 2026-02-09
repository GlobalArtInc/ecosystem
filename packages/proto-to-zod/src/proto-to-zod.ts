import {
  parse,
  Root,
  Type,
  Enum,
  Namespace,
  Field,
  OneOf,
  ReflectionObject,
} from "protobufjs";
import { ProtoToZodOptions } from "./types";
import { getZodType } from "./utils";

export const protoToZod = (
  protoContent: string,
  options: ProtoToZodOptions = {}
): string => {
  const parsed = parse(protoContent);
  const root = parsed.root;
  const output: string[] = [];

  output.push(`import { z } from "zod";`);

  function processEnum(enumItem: Enum, prefix: string) {
    const enumName = `${prefix}${enumItem.name}`;
    const values = Object.entries(enumItem.values)
      .map(([key, value]) => `  ${key} = ${value},`)
      .join("\n");

    output.push(`export enum ${enumName} {
${values}
}`);
    output.push(`export const ${enumName}Schema = z.nativeEnum(${enumName});`);
  }

  function processType(typeItem: Type, prefix: string) {
    const typeName = `${prefix}${typeItem.name}`;

    // Process nested types and enums first
    if (typeItem.nestedArray) {
      typeItem.nestedArray.forEach((nested: ReflectionObject) => {
        if (nested instanceof Enum) {
          processEnum(nested, `${typeName}_`);
        } else if (nested instanceof Type) {
          processType(nested, `${typeName}_`);
        }
      });
    }

    const fields: string[] = [];

    // Handle OneOfs
    const oneOfs = new Map<string, string[]>();
    typeItem.oneofsArray.forEach((oneof: OneOf) => {
      oneOfs.set(
        oneof.name,
        oneof.fieldsArray.map((f: Field) => f.name)
      );
    });

    typeItem.fieldsArray.forEach((field: Field) => {
      let fieldType = field.type;

      const basicTypes = [
        "double",
        "float",
        "int32",
        "uint32",
        "sint32",
        "fixed32",
        "sfixed32",
        "int64",
        "uint64",
        "sint64",
        "fixed64",
        "sfixed64",
        "bool",
        "string",
        "bytes",
      ];

      if (!basicTypes.includes(fieldType)) {
        fieldType = fieldType.replace(/\./g, "_");
      }

      const zodDef = getZodType(fieldType, field.repeated, true);

      fields.push(`  ${field.name}: ${zodDef},`);
    });

    output.push(`export const ${typeName}Schema = z.object({
${fields.join("\n")}
});`);
    output.push(`export type ${typeName} = z.infer<typeof ${typeName}Schema>;`);
  }

  function processNamespace(namespace: Namespace, prefix: string) {
    namespace.nestedArray.forEach((nested: ReflectionObject) => {
      if (nested instanceof Type) {
        processType(nested, prefix);
      } else if (nested instanceof Enum) {
        processEnum(nested, prefix);
      } else if (nested instanceof Namespace) {
        processNamespace(nested, `${prefix}${nested.name}_`);
      }
    });
  }

  if (root) {
    processNamespace(root, "");
  }

  return output.join("\n\n");
};
