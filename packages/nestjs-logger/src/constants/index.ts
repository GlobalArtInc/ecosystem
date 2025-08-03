export const LOGGER_CONFIG_TOKEN = "LOGGER_CONFIG";
export const LOGGER_CONTEXT_METADATA = "LOGGER_CONTEXT";
export const LOGGER_METADATA_METADATA = "LOGGER_METADATA";
export const LOGGER_EXCLUDE_METADATA = "LOGGER_EXCLUDE";

export const DEFAULT_SENSITIVE_FIELDS = [
  "password",
  "pass",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "key",
  "apiKey",
  "authorization",
  "auth",
  "credential",
  "credentials",
] as const;

export const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bright: "\x1b[1m",
} as const;

export const DEFAULT_LOGGER_CONFIG = {
  level: "info" as const,
  timestamp: true,
  colors: true,
  format: "text" as const,
  sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
  exclude: [],
} as const;
