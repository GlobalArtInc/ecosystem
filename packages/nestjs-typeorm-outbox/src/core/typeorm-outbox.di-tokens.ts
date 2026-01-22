import { Inject } from "@nestjs/common";

export const TYPEORM_OUTBOX_CRON_CONFIG_TOKEN = Symbol(
  "TYPEORM_OUTBOX_CRON_CONFIG_TOKEN",
);
export const TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN = Symbol(
  "TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN",
);
export const TYPEORM_OUTBOX_SERVICE_TOKEN = Symbol(
  "TYPEORM_OUTBOX_SERVICE_TOKEN",
);
export const TYPEORM_OUTBOX_BROKER_TOKEN = Symbol(
  "TYPEORM_OUTBOX_BROKER_TOKEN",
);

export const InjectTypeormOutboxCronConfig = () =>
  Inject(TYPEORM_OUTBOX_CRON_CONFIG_TOKEN);
export const InjectTypeormOutboxModuleConfig = () =>
  Inject(TYPEORM_OUTBOX_MODULE_CONFIG_TOKEN);
export const InjectTypeormOutboxService = () =>
  Inject(TYPEORM_OUTBOX_SERVICE_TOKEN);
export const InjectTypeormOutboxBroker = () =>
  Inject(TYPEORM_OUTBOX_BROKER_TOKEN);
