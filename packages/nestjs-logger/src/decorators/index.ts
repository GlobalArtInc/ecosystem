import { SetMetadata } from "@nestjs/common";
import {
  LOGGER_CONTEXT_METADATA,
  LOGGER_METADATA_METADATA,
  LOGGER_EXCLUDE_METADATA,
} from "../constants";

export const LogContext = (context: string) =>
  SetMetadata(LOGGER_CONTEXT_METADATA, context);

export const LogMetadata = (metadata: Record<string, unknown>) =>
  SetMetadata(LOGGER_METADATA_METADATA, metadata);

export const ExcludeLogging = () => SetMetadata(LOGGER_EXCLUDE_METADATA, true);
