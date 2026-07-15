# @globalart/nestjs-kafka

A NestJS microservice transport built on top of `@confluentinc/kafka-javascript`.

## Features

- **Transport strategy** — drop-in `CustomTransportStrategy` for `app.connectMicroservice()`
- **Client proxy** — `KafkaClient` / `KafkaClientsModule` for publishing events and RPC calls
- **Message decorators** — `@KafkaMessageKey`, `@KafkaMessageHeaders`, `@KafkaMessageAck`, `@KafkaMessageNack`, and more
- **Inject decorators** — `InjectKafkaProducer`, `InjectKafkaConsumer`, `InjectKafkaAdmin`, etc.
- **Retry strategies** — fixed or exponential back-off with configurable jitter and max retries
- **Dead Letter Queue** — automatically routes exhausted messages to a DLQ topic
- **Per-handler retry overrides** — `@KafkaRetry` to customize max retries / DLQ per `@EventPattern` handler
- **Batch mode** — `eachBatch` consumer with per-message offset resolution
- **Producer-only mode** — skip consumer setup when you only need to produce
- **Schema Registry** — built-in Protobuf serde via `@confluentinc/schemaregistry`
- **Custom serde** — plug in any serializer / deserializer
- **Health indicator** — `KafkaHealthIndicator` for `@nestjs/terminus`
- **SASL / SSL** — full authentication support via KafkaJS options

## Installation

```bash
npm install @globalart/nestjs-kafka @confluentinc/kafka-javascript
```

## Documentation

For complete documentation, examples, and API reference, please visit the [official documentation](https://globalart.js.org/packages/nestjs-kafka).

## License

MIT
