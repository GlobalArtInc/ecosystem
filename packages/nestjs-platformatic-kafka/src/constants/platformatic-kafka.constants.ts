export const KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN = 'PLATFORMATIC_KAFKA_CONSUMER_MODULE_OPTIONS';
export const KAFKA_SUBSCRIBE_METADATA = 'platformatic_kafka:subscribe';

export const DEFAULT_PLATFORMATIC_STREAM_CONSUME = {
  mode: 'committed',
  fallbackMode: 'latest',
} as const;
