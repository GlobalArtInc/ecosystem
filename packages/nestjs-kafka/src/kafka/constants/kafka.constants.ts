export const KAFKA_SUBSCRIBE_METADATA = "kafka:subscribe";
export const DEFAULT_POSTFIX_SERVER = "-server";
export const DEFAULT_POSTFIX_CLIENT = "-client";
export const DEFAULT_RETRY_DELAY_MS = 5000;

export function resolvePostfix(
  configured: string | undefined,
  fallback: string,
): string {
  return configured !== undefined && configured.length > 0 ? configured : fallback;
}

export function applyPostfix(
  options: { clientId?: string; groupId: string; postfixId?: string },
  defaultPostfix: string,
): { clientId: string | undefined; groupId: string } {
  const postfix = resolvePostfix(options.postfixId, defaultPostfix);
  return {
    clientId: options.clientId !== undefined ? options.clientId + postfix : undefined,
    groupId: options.groupId + postfix,
  };
}
