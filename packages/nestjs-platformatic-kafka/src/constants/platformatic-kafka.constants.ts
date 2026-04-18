export const KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN = 'PLATFORMATIC_KAFKA_CONSUMER_MODULE_OPTIONS';
export const KAFKA_SUBSCRIBE_METADATA = 'platformatic_kafka:subscribe';

export const DEFAULT_POSTFIX_SERVER = "-server";
export const DEFAULT_POSTFIX_CLIENT = "-client";

export const DEFAULT_KAFKA_METADATA_MAX_AGE_MS = 1500;

export const DEFAULT_PLATFORMATIC_STREAM_CONSUME = {
  mode: 'committed',
  fallbackMode: 'latest',
} as const;
