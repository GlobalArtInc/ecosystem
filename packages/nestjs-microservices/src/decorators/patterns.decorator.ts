import { applyDecorators } from "@nestjs/common";
import { MessagePattern, Transport } from "@nestjs/microservices";

/**
 * TCP message pattern decorator
 * @param pattern - Pattern name
 */
const TcpPattern = (pattern: unknown) =>
  applyDecorators(MessagePattern(pattern, Transport.TCP));

/**
 * Redis message pattern decorator
 * @param pattern - Pattern name
 */
const RedisPattern = (pattern: unknown) =>
  applyDecorators(MessagePattern(pattern, Transport.REDIS));

/**
 * MQTT message pattern decorator
 * @param pattern - Pattern name
 */
const MqttPattern = (pattern: unknown) =>
  applyDecorators(MessagePattern(pattern, Transport.MQTT));

/**
 * gRPC message pattern decorator
 * @param pattern - Pattern name
 */
const GrpcPattern = (pattern: unknown) =>
  applyDecorators(MessagePattern(pattern, Transport.GRPC));

/**
 * NATS message pattern decorator
 * @param pattern - Pattern name
 */
const NatsPattern = (pattern: unknown) =>
  applyDecorators(MessagePattern(pattern, Transport.NATS));

/**
 * RabbitMQ message pattern decorator
 * @param pattern - Pattern name
 */
const RabbitMqPattern = (pattern: unknown) =>
  applyDecorators(MessagePattern(pattern, Transport.RMQ));

/**
 * Kafka message pattern decorator
 * @param pattern - Pattern name
 */
const KafkaPattern = (pattern: unknown) =>
  applyDecorators(MessagePattern(pattern, Transport.KAFKA));

export {
  TcpPattern,
  RedisPattern,
  MqttPattern,
  GrpcPattern,
  NatsPattern,
  RabbitMqPattern,
  KafkaPattern,
};
