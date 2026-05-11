import type { KafkaJS } from "@confluentinc/kafka-javascript";
import type {
  KafkaDeserializer,
  KafkaSerializer,
  SerdePayload,
} from "./kafka-serde.interface";

/** Default serializer — encodes values as JSON strings in a UTF-8 Buffer. */
export class JsonKafkaSerializer implements KafkaSerializer {
  async serialize(
    _topic: string,
    payload: unknown,
    _headers?: KafkaJS.IHeaders,
  ): Promise<Buffer> {
    return Buffer.from(JSON.stringify(payload || {}), "utf8");
  }
}

/** Default deserializer — decodes a UTF-8 Buffer as a JSON value. */
export class JsonKafkaDeserializer implements KafkaDeserializer {
  async deserialize(
    _topic: string,
    payload: SerdePayload,
    _headers?: KafkaJS.IHeaders,
  ): Promise<unknown> {
    if (!payload) return {};
    return JSON.parse(payload.toString("utf8"));
  }
}
