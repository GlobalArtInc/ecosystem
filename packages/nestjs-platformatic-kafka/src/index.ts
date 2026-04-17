// Transport strategy — подключается в main.ts через app.connectMicroservice()
export { PlatformaticKafkaStrategy } from './platformatic-kafka.strategy';

// Client proxy — регистрируется как провайдер в AppModule для produce
export { PlatformaticKafkaClient } from './platformatic-kafka.client';

// Execution context — инжектируется через @Ctx() в обработчиках событий
export { PlatformaticKafkaContext } from './platformatic-kafka.context';

// Типы для конфигурации и аннотаций
export type {
  PlatformaticKafkaOptions,
  PlatformaticKafkaMessage,
  KafkaConsumer,
  KafkaProducer,
} from './platformatic-kafka.types';
export { PlatformaticKafkaStatus } from './platformatic-kafka.types';
