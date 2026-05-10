import type { KafkaJS } from "@confluentinc/kafka-javascript";
import {
  ProtobufDeserializer,
  ProtobufSerializer,
  SerdeType,
  type ProtobufDeserializerConfig,
  type ProtobufSerializerConfig,
} from "@confluentinc/schemaregistry";
import type { SchemaRegistryClient } from "@confluentinc/schemaregistry";
import type { KafkaDeserializer, KafkaSerializer, SerdePayload } from "./kafka-serde.interface";

/** Serializes Protobuf messages using Confluent Schema Registry wire format. */
export class ProtobufKafkaSerializer implements KafkaSerializer {
  private readonly inner: ProtobufSerializer;

  constructor(
    client: SchemaRegistryClient,
    config: ProtobufSerializerConfig = { autoRegisterSchemas: true },
  ) {
    this.inner = new ProtobufSerializer(client, SerdeType.VALUE, config);
  }

  serialize(topic: string, data: unknown, headers?: KafkaJS.IHeaders): Promise<Buffer> {
    return this.inner.serialize(topic, data, headers);
  }
}

/** Deserializes Protobuf messages encoded in Confluent Schema Registry wire format. */
export class ProtobufKafkaDeserializer implements KafkaDeserializer {
  private readonly inner: ProtobufDeserializer;

  constructor(
    client: SchemaRegistryClient,
    config: ProtobufDeserializerConfig = {},
  ) {
    this.inner = new ProtobufDeserializer(client, SerdeType.VALUE, config);
  }

  async deserialize(topic: string, payload: SerdePayload, headers?: KafkaJS.IHeaders): Promise<unknown> {
    if (payload == null) return undefined;
    return this.inner.deserialize(topic, payload, headers);
  }
}
