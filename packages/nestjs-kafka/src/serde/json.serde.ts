import type { KafkaJS } from "@confluentinc/kafka-javascript";
import type { KafkaDeserializer, KafkaSerializer, SerdePayload } from "./kafka-serde.interface";
import { deserializeJson, serializeJson } from "../utils/json.utils";

/** Default serializer — encodes values as JSON strings in a UTF-8 Buffer. */
export class JsonKafkaSerializer implements KafkaSerializer {
  async serialize(_topic: string, data: unknown, _headers?: KafkaJS.IHeaders): Promise<Buffer> {
    return Buffer.from(serializeJson(data), "utf8");
  }
}

/** Default deserializer — decodes a UTF-8 Buffer as a JSON value. */
export class JsonKafkaDeserializer implements KafkaDeserializer {
  async deserialize(_topic: string, payload: SerdePayload, _headers?: KafkaJS.IHeaders): Promise<unknown> {
    return deserializeJson(payload);
  }
}
