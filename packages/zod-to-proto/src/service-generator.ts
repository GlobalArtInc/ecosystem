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

interface ServiceGenerationContext {
  messages: Map<string, string[]>;
  enums: Map<string, string[]>;
  typePrefix: string | null;
}

const parseZodServiceSchema = (
  name: string,
  schema: ZodObject<Record<string, ZodTypeAny>>
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

        methods.push({
          name: methodName,
          request,
          response,
        });
      }
    }
  }

  return {
    name,
    methods,
  };
};

const normalizeServices = (services: ServicesInput): ServiceDefinition[] => {
  if (Array.isArray(services)) {
    return services;
  }

  return Object.entries(services).map(([name, schema]) =>
    parseZodServiceSchema(name, schema)
  );
};

const ensureZodObject = (
  schema: ZodTypeAny
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

const generateRequestMessageName = (
  methodName: string,
  typePrefix: string | null
): string => {
  const messageName = toPascalCase({ value: `${methodName}Request` });
  return typePrefix ? `${typePrefix}${messageName}` : messageName;
};

const generateResponseMessageName = (
  methodName: string,
  typePrefix: string | null
): string => {
  const messageName = toPascalCase({ value: `${methodName}Response` });
  return typePrefix ? `${typePrefix}${messageName}` : messageName;
};

const processServiceMethod = (
  method: ServiceMethod,
  context: ServiceGenerationContext
): { requestName: string; responseName: string } => {
  const { messages, enums, typePrefix } = context;

  const requestName = generateRequestMessageName(method.name, typePrefix);
  const responseName = generateResponseMessageName(method.name, typePrefix);

  if (!messages.has(requestName)) {
    const requestSchema = ensureZodObject(method.request);
    const requestFields = traverseSchema({
      schema: requestSchema,
      messages,
      enums,
      typePrefix,
      parentKey: requestName,
    });
    messages.set(requestName, requestFields);
  }

  if (!messages.has(responseName)) {
    const responseSchema = ensureZodObject(method.response);
    const responseFields = traverseSchema({
      schema: responseSchema,
      messages,
      enums,
      typePrefix,
      parentKey: responseName,
    });
    messages.set(responseName, responseFields);
  }

  return { requestName, responseName };
};

export const generateServices = (
  services: ServicesInput,
  context: ServiceGenerationContext
): string[] => {
  const normalizedServices = normalizeServices(services);

  return normalizedServices.map((service) => {
    const methods = service.methods.map((method) => {
      const { requestName, responseName } = processServiceMethod(
        method,
        context
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
