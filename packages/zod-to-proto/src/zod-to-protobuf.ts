import type { ZodTypeAny } from "zod";
import type { ZodToProtobufOptions } from "./types";
import { traverseSchema } from "./traversers";
import { generateServices } from "./service-generator";
import { z } from "zod";

/**
 * Generates a protobuf definition string for services only (without root message).
 * Convenience function that calls zodToProtobuf with an empty schema.
 *
 * @param options - Options for protobuf generation
 * @returns Protobuf definition string
 */
export const zodToProtobufService = (
  options: ZodToProtobufOptions = {}
): string => {
  return zodToProtobuf(z.object(), options);
};

/**
 * Converts a Zod schema to a protobuf definition string.
 * Generates messages, enums, and services based on the provided schema and options.
 *
 * @param schema - Optional Zod schema to convert (if not provided, only services will be generated)
 * @param options - Options for protobuf generation including package name, root message name, type prefix, and services
 * @returns Complete protobuf definition string
 */
export const zodToProtobuf = (
  schema?: ZodTypeAny,
  options: ZodToProtobufOptions = {}
): string => {
  const {
    packageName = "default",
    rootMessageName = "Message",
    typePrefix = "",
    services,
    skipRootMessage = false,
  } = options;

  const messages = new Map<string, string[]>();
  const enums = new Map<string, string[]>();

  if (schema && !skipRootMessage) {
    const fields = traverseSchema({ schema, messages, enums, typePrefix });
    if (fields.length > 0) {
      const rootMessageKey = `${typePrefix}${rootMessageName}`;
      messages.set(rootMessageKey, fields);
    }
  }

  const context = {
    messages,
    enums,
    typePrefix: typePrefix || null,
  };

  const hasServices =
    services &&
    (Array.isArray(services)
      ? services.length > 0
      : Object.keys(services).length > 0);

  const servicesString = hasServices ? generateServices(services, context) : [];

  const enumsString = Array.from(enums.values()).map((enumDef) =>
    enumDef.join("\n")
  );

  const messagesString = Array.from(messages.entries()).map(
    ([name, fields]) =>
      `message ${name} {\n${fields.map((field) => `    ${field}`).join("\n")}\n}`
  );

  const content = [servicesString, enumsString, messagesString]
    .filter((strings) => !!strings.length)
    .map((strings) => strings.join("\n\n"))
    .join("\n\n");

  const protoDefinition = `
syntax = "proto3";
package ${packageName};

${content}
`;

  return protoDefinition.trim();
};
