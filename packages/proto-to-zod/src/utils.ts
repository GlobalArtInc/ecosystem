export const toPascalCase = (str: string): string => {
  return str.replace(/(^\w|_\w)/g, (m) => m.replace("_", "").toUpperCase());
};

export const toCamelCase = (str: string): string => {
  return str.replace(/_(\w)/g, (_, c) => c.toUpperCase());
};

export const getZodType = (
  protoType: string,
  repeated: boolean = false,
  optional: boolean = false
): string => {
  let zodType = "z.any()";

  switch (protoType) {
    case "double":
    case "float":
      zodType = "z.number()";
      break;
    case "int32":
    case "uint32":
    case "sint32":
    case "fixed32":
    case "sfixed32":
      zodType = "z.number().int()";
      break;
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64":
      zodType = "z.number().int()"; // Or z.bigint() if needed
      break;
    case "bool":
      zodType = "z.boolean()";
      break;
    case "string":
      zodType = "z.string()";
      break;
    case "bytes":
      zodType = "z.instanceof(Uint8Array)";
      break;
    default:
      // Assuming it's a message or enum reference
      zodType = `${protoType}Schema`;
      break;
  }

  if (repeated) {
    zodType = `z.array(${zodType})`;
  }

  if (optional) {
    zodType = `${zodType}.optional()`;
  }

  return zodType;
};
