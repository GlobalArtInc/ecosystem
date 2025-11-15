import type { ZodObject, ZodTypeAny } from "zod";

export type ServicesInput =
  | ServiceDefinition[]
  | Record<string, ZodObject<any>>;

export interface ZodToProtobufOptions {
  packageName?: string;
  rootMessageName?: string;
  typePrefix?: string;
  services?: ServicesInput;
  skipRootMessage?: boolean;
}

export interface ServiceMethod {
  name: string;
  request: ZodTypeAny;
  response: ZodTypeAny;
  streaming?: "client" | "server" | "bidirectional";
}

export interface ServiceDefinition {
  name: string;
  methods: ServiceMethod[];
}

export interface ZodFunctionDefinition {
  type: "function";
  input: ZodTypeAny;
  output: ZodTypeAny;
}

export interface ZodMapDefinition {
  keyType: ZodTypeAny;
  valueType: ZodTypeAny;
}

export interface ZodRecordDefinition {
  keyType: ZodTypeAny;
  valueType: ZodTypeAny;
}

export interface ZodArrayDefinition {
  valueType: ZodTypeAny;
  element: ZodTypeAny;
}

export interface ZodTupleDefinition {
  items?: ZodTypeAny[];
}

export interface ProtobufField {
  types: Array<string | null>;
  name: string;
}
