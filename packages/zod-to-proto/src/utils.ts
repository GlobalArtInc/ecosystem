import { ZodEnum, ZodNumber } from "zod";
import type { ProtobufField } from "./types";

/**
 * Determines the protobuf number type name based on Zod number schema.
 * Returns "int32" for integers, "double" for floating point numbers.
 *
 * @param value - Zod number schema
 * @returns Protobuf number type name ("int32" or "double")
 */
export const getNumberTypeName = ({ value }: { value: ZodNumber }): string => {
  return ['float32', 'float64'].includes(value.format ?? '') ? "double" : "int32";
};

/**
 * Converts a string to PascalCase format.
 * Handles dot-separated strings by capitalizing each part.
 *
 * @param value - String to convert
 * @returns PascalCase string
 */
export const toPascalCase = ({ value }: { value: string }): string => {
  return value
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
};

/**
 * Converts a protobuf field definition to its type string representation.
 * Filters out null/empty values and joins the remaining types.
 *
 * @param field - Protobuf field definition
 * @returns Type string for the protobuf field
 */
export const protobufFieldToType = ({
  field,
}: {
  field: ProtobufField;
}): string => {
  return field.types.filter(Boolean).join(" ");
};

export const getEnumByIndex = (schema: ZodEnum, index: number): unknown => {
  return schema.options[index] || null;
}
