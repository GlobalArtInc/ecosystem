# @globalart/platformatic-kafka

A NestJS microservice transport built on top of `@platformatic/kafka`.

## Features

- **Transport strategy** — drop-in `CustomTransportStrategy` for `app.connectMicroservice()`
- **Client proxy** — `PlatformaticKafkaClient` for publishing events and messages
- **Auto-reconnect** — exponential backoff on broker failures, for both strategy and client
- **Producer-only mode** — skip consumer setup when you only need to produce
- **Batch emit** — send multiple messages in a single broker round-trip
- **Type-safe** — full TypeScript support

## Installation

```bash
npm install @globalart/platformatic-kafka @platformatic/kafka
```

## Documentation

For complete documentation, examples, and API reference, please visit the [official documentation](https://globalart.js.org/packages/nestjs-platformatic-kafka).

## License

MIT
