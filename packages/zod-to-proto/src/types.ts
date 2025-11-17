import type { ZodObject, ZodTypeAny } from "zod";

/**
 * Input type for service definitions.
 * Can be either an array of service definitions or an object mapping service names to Zod schemas.
 */
export type ServicesInput =
  | ServiceDefinition[]
  | Record<string, ZodObject<any>>;

/**
 * Options for converting Zod schemas to protobuf definitions.
 */
export interface ZodToProtobufOptions {
  /** Package name for the generated protobuf file */
  packageName?: string;
  /** Name of the root message (default: "Message") */
  rootMessageName?: string;
  /** Prefix to add to all generated type names */
  typePrefix?: string;
  /** Service definitions to include in the protobuf output */
  services?: ServicesInput;
  /** Whether to skip generating the root message */
  skipRootMessage?: boolean;
}

/**
 * Definition of a single service method.
 */
export interface ServiceMethod {
  /** Method name */
  name: string;
  /** Zod schema for the request message */
  request: ZodTypeAny;
  /** Zod schema for the response message */
  response: ZodTypeAny;
  /** Streaming type: "client" for client streaming, "server" for server streaming, "bidirectional" for both */
  streaming?: "client" | "server" | "bidirectional";
}

/**
 * Definition of a protobuf service containing multiple methods.
 */
export interface ServiceDefinition {
  /** Service name */
  name: string;
  /** Array of service methods */
  methods: ServiceMethod[];
}

/**
 * Internal definition structure for Zod function types.
 */
export interface ZodFunctionDefinition {
  type: "function";
  input: ZodTypeAny;
  output: ZodTypeAny;
}

/**
 * Internal definition structure for Zod map types.
 */
export interface ZodMapDefinition {
  keyType: ZodTypeAny;
  valueType: ZodTypeAny;
}

/**
 * Internal definition structure for Zod record types.
 */
export interface ZodRecordDefinition {
  keyType: ZodTypeAny;
  valueType: ZodTypeAny;
}

/**
 * Internal definition structure for Zod array types.
 */
export interface ZodArrayDefinition {
  valueType: ZodTypeAny;
  element: ZodTypeAny;
}

/**
 * Internal definition structure for Zod tuple types.
 */
export interface ZodTupleDefinition {
  items?: ZodTypeAny[];
}

/**
 * Represents a protobuf field with its type information and name.
 */
export interface ProtobufField {
  /** Array of type strings (may include "optional", "repeated", or type name) */
  types: Array<string | null>;
  /** Field name */
  name: string;
}
