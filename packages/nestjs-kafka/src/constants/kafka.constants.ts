/** Transport identifier for the rdkafka-based Kafka strategy. */
export const RDKAFKA_TRANSPORT: unique symbol = Symbol("RDKAFKA");

/** Default injection token for a {@link KafkaClient} registered via {@link KafkaClientsModule}. */
export const KAFKA_CLIENT_TOKEN = Symbol("KAFKA_CLIENT");

/** Default injection token for a `KafkaJS.Admin` registered via {@link KafkaAdminModule}. */
export const KAFKA_ADMIN_TOKEN = Symbol("KAFKA_ADMIN");

/** Default group/client ID suffix used by the server-side strategy. */
export const DEFAULT_POSTFIX_SERVER = "-server";
/** Default group/client ID suffix used by the client-side broker. */
export const DEFAULT_POSTFIX_CLIENT = "-client";
/** Default delay in milliseconds between retry attempts. */
export const DEFAULT_RETRY_DELAY_MS = 5000;

/** Returns the configured postfix when non-empty, otherwise falls back to the default. */
export const resolvePostfix = (
  configured: string | undefined,
  fallback: string,
): string => {
  return configured && configured.length > 0 ? configured : fallback;
};

/** Appends a postfix to `clientId` (if set) and `groupId` using {@link resolvePostfix}. */
export const applyPostfix = (
  options: { clientId?: string; groupId: string; postfixId?: string },
  defaultPostfix: string,
): { clientId: string | undefined; groupId: string } => {
  const postfix = resolvePostfix(options.postfixId, defaultPostfix);
  return {
    clientId: options.clientId ? options.clientId + postfix : undefined,
    groupId: options.groupId + postfix,
  };
};
