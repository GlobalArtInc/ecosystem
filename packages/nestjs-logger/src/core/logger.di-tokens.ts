import { Inject } from "@nestjs/common";
import {
  LOGGER_SERVICE_TOKEN,
  DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN,
} from "../constants";

const contextLoggerCache = new Map<string, symbol>();

export const InjectLogger = (context?: string) => {
  if (context) {
    if (!contextLoggerCache.has(context)) {
      contextLoggerCache.set(context, Symbol(`LOGGER_CONTEXT_${context}`));
    }
    return Inject(contextLoggerCache.get(context)!);
  }
  return Inject(LOGGER_SERVICE_TOKEN);
};

export const getContextLoggerToken = (context: string): symbol => {
  if (!contextLoggerCache.has(context)) {
    contextLoggerCache.set(context, Symbol(`LOGGER_CONTEXT_${context}`));
  }
  return contextLoggerCache.get(context)!;
};

export const getAllContextTokens = (): string[] => {
  return Array.from(contextLoggerCache.keys());
};
