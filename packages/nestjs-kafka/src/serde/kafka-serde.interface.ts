import type { KafkaJS } from "@confluentinc/kafka-javascript";

export type SerdePayload = Buffer | null | undefined;

/** Serializes a value to a Buffer before sending to Kafka. */
export interface KafkaSerializer {
  serialize(
    topic: string,
    payload: unknown,
    headers?: KafkaJS.IHeaders,
  ): Promise<Buffer>;
}

/** Deserializes a raw Kafka message payload into a typed value. */
export interface KafkaDeserializer {
  deserialize(
    topic: string,
    payload: SerdePayload,
    headers?: KafkaJS.IHeaders,
  ): Promise<unknown>;
}
