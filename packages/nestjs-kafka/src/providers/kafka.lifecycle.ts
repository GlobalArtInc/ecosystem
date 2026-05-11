import { KafkaJS } from "@confluentinc/kafka-javascript";
import { OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { KafkaConnectionOptions } from "../interfaces/kafka-connection-options";
import { debugLog } from "../utils/kafka.utils";

/**
 * Manages lifecycle events for the `KafkaModule`. When the `autoConnect`
 * parameter is enabled, this class ensures the proper connection and
 * disconnection of Kafka providers (producer and consumer) during the
 * application's lifecycle.
 * @internal
 */
export default class KafkaLifecycleManager
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly config: KafkaConnectionOptions,
    private readonly producer: KafkaJS.Producer,
    private readonly consumer: KafkaJS.Consumer,
    private readonly admin: KafkaJS.Admin,
  ) {
    this.consumerAutoConnect = this.config?.consumer?.autoConnect || true;
    this.producerAutoConnect = this.config?.producer?.autoConnect || true;
    this.adminClientAutoConnect = this.config?.adminClient?.autoConnect || true;
  }
  private consumerAutoConnect: boolean;
  private producerAutoConnect: boolean;
  private adminClientAutoConnect: boolean;

  async onApplicationShutdown() {
    if (this.consumerAutoConnect && this.consumer) {
      try {
        await this.consumer.disconnect();
      } catch (e) {
        console.error("failed to disconnect consumer: %s", e);
      }
    }

    if (this.producerAutoConnect && this.producer) {
      try {
        await this.producer.flush();
        await this.producer.disconnect();
      } catch (e) {
        console.error("failed to disconnect producer: %s", e);
      }
    }

    if (this.adminClientAutoConnect && this.admin) {
      try {
        debugLog("Admin client disconnecting");
        await this.admin.disconnect();
        debugLog("Admin client disconnected successfully.");
      } catch (e) {
        console.error("failed to disconnect admin client: %s", e);
      }
    }
  }

  async onModuleInit() {
    if (this.consumerAutoConnect && this.consumer) {
      await this.consumer.connect();
    }
    if (this.producerAutoConnect && this.producer) {
      await this.producer.connect();
    }
    if (this.adminClientAutoConnect && this.admin) {
      await this.admin.connect();
    }
  }
}
