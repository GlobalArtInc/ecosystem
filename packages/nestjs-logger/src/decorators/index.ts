import { SetMetadata } from "@nestjs/common";
import {
  LOGGER_CONTEXT_METADATA,
  LOGGER_METADATA_METADATA,
} from "../constants";

/**
 * Decorator to set logging context for a class or method
 */
export const LogContext = (context: string) =>
  SetMetadata(LOGGER_CONTEXT_METADATA, context);

/**
 * Decorator to add metadata to logs
 */
export const LogMetadata = (metadata: Record<string, unknown>) =>
  SetMetadata(LOGGER_METADATA_METADATA, metadata);
