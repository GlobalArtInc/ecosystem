import { z, ZodObject, type ZodTypeAny } from "zod";
import type {
  ServiceDefinition,
  ServiceMethod,
  ServicesInput,
  ZodFunctionDefinition,
  ZodTupleDefinition,
} from "./types";
import { toPascalCase } from "./utils";
import { traverseSchema } from "./traversers";

/**
 * Context for generating protobuf services.
 * Contains accumulated messages, enums, and type prefix.
 */
interface ServiceGenerationContext {
  /** Map of message names to their protobuf fields */
  messages: Map<string, string[]>;
  /** Map of enum names to their protobuf values */
  enums: Map<string, string[]>;
  /** Prefix for type names or null if prefix is not used */
  typePrefix: string | null;
  /** Map of schema instance to message name for deduplication */
  schemaToMessageName?: WeakMap<ZodTypeAny, string>;
}

/**
 * Parses a Zod service schema and extracts method definitions.
 * Each method must be a function with one argument (request) and a return value (response).
 *
 * @param name - Service name
 * @param schema - Zod object containing service methods as functions
 * @returns Service definition with extracted methods
 */
const parseZodServiceSchema = (
  name: string,
  schema: ZodObject<Record<string, ZodTypeAny>>,
): ServiceDefinition => {
  const shape = schema.shape as Record<string, ZodTypeAny>;
  const methods: ServiceMethod[] = [];

  for (const [methodName, methodSchema] of Object.entries(shape)) {
    const methodDef = (methodSchema as ZodTypeAny).def as ZodFunctionDefinition;

    if (methodDef.type === "function") {
      const inputDef = methodDef.input;

      const args = (inputDef?.def as ZodTupleDefinition)?.items ?? [];
      const output = methodDef.output as ZodTypeAny;

      if (args.length > 0 && args[0] && output) {
        const request = args[0];
        const response = output;

        let streaming: "client" | "server" | "bidirectional" | undefined;
        const metadata = methodSchema.meta();
        streaming = metadata?.streaming as
          | "client"
          | "server"
          | "bidirectional"
          | undefined;

        methods.push({
          name: methodName,
          request,
          response,
          streaming,
        });
      }
    }
  }

  return {
    name,
    methods,
  };
};

/**
 * Normalizes service input data into an array of service definitions.
 * If an array is passed, returns it as is.
 * If an object is passed, converts each key-value pair into a service definition.
 *
 * @param services - Array of service definitions or object with Zod schemas
 * @returns Array of normalized service definitions
 */
const normalizeServices = (services: ServicesInput): ServiceDefinition[] => {
  if (Array.isArray(services)) {
    return services;
  }

  return Object.entries(services).map(([name, schema]) =>
    parseZodServiceSchema(name, schema),
  );
};

/**
 * Ensures that the schema is a ZodObject.
 * If the schema is already an object, returns it as is.
 * Otherwise, wraps the schema in an object with a "data" field.
 *
 * @param schema - Zod schema of any type
 * @returns ZodObject containing the original schema
 */
const ensureZodObject = (
  schema: ZodTypeAny,
): ZodObject<Record<string, ZodTypeAny>> => {
  const schemaType =
    (schema.def as { type?: string }).type || schema.constructor.name;

  if (schemaType === "object" || schema.constructor.name === "ZodObject") {
    return schema as ZodObject<Record<string, ZodTypeAny>>;
  }

  return z.object({
    data: schema,
  });
};

/**
 * Generates the name for a request message based on the method name.
 *
 * @param methodName - Name of the service method
 * @param typePrefix - Optional prefix for type names
 * @returns Generated request message name in PascalCase
 */
const generateRequestMessageName = (
  methodName: string,
  typePrefix: string | null,
): string => {
  const messageName = toPascalCase({ value: `${methodName}Request` });
  return typePrefix ? `${typePrefix}${messageName}` : messageName;
};

/**
 * Generates the name for a response message based on the method name.
 *
 * @param methodName - Name of the service method
 * @param typePrefix - Optional prefix for type names
 * @returns Generated response message name in PascalCase
 */
const generateResponseMessageName = (
  methodName: string,
  typePrefix: string | null,
): string => {
  const messageName = toPascalCase({ value: `${methodName}Response` });
  return typePrefix ? `${typePrefix}${messageName}` : messageName;
};

/**
 * Processes a service method by generating request and response message names
 * and traversing their schemas to populate the context with message definitions.
 *
 * @param method - Service method definition
 * @param context - Generation context containing messages, enums, and type prefix
 * @returns Object containing request and response message names
 */
const processServiceMethod = (
  method: ServiceMethod,
  context: ServiceGenerationContext,
): { requestName: string; responseName: string } => {
  const { messages, enums, typePrefix, schemaToMessageName } = context;

  const requestSchema = ensureZodObject(method.request);
  let requestName = schemaToMessageName?.get(requestSchema);
  if (requestName === undefined) {
    requestName = generateRequestMessageName(method.name, typePrefix);
    const requestFields = traverseSchema({
      schema: requestSchema,
      messages,
      enums,
      typePrefix,
      parentKey: requestName,
      schemaToMessageName,
    });
    messages.set(requestName, requestFields);
    schemaToMessageName?.set(requestSchema, requestName);
  }

  const responseSchema = ensureZodObject(method.response);
  let responseName = schemaToMessageName?.get(responseSchema);
  if (responseName === undefined) {
    responseName = generateResponseMessageName(method.name, typePrefix);
    const responseFields = traverseSchema({
      schema: responseSchema,
      messages,
      enums,
      typePrefix,
      parentKey: responseName,
      schemaToMessageName,
    });
    messages.set(responseName, responseFields);
    schemaToMessageName?.set(responseSchema, responseName);
  }

  return { requestName, responseName };
};

/**
 * Generates protobuf service definitions from Zod service schemas.
 * Supports streaming methods (client, server, bidirectional).
 *
 * @param services - Service definitions as array or object with Zod schemas
 * @param context - Generation context containing messages, enums, and type prefix
 * @returns Array of protobuf service definition strings
 */
export const generateServices = (
  services: ServicesInput,
  context: ServiceGenerationContext,
): string[] => {
  const normalizedServices = normalizeServices(services);

  return normalizedServices.map((service) => {
    const methods = service.methods.map((method) => {
      const { requestName, responseName } = processServiceMethod(
        method,
        context,
      );

      const requestStreaming =
        method.streaming === "client" || method.streaming === "bidirectional";
      const responseStreaming =
        method.streaming === "server" || method.streaming === "bidirectional";

      const requestType = requestStreaming
        ? `stream ${requestName}`
        : requestName;
      const responseType = responseStreaming
        ? `stream ${responseName}`
        : responseName;

      return `    rpc ${toPascalCase({ value: method.name })}(${requestType}) returns (${responseType});`;
    });

    return `service ${toPascalCase({ value: service.name })} {\n${methods.join("\n")}\n}`;
  });
};
