import { applyDecorators } from "@nestjs/common";
import { MessagePattern, Transport } from "@nestjs/microservices";

/**
 * TCP message pattern decorator
 * @param name - Pattern name
 */
const TcpPattern = (name: unknown) =>
  applyDecorators(MessagePattern(name, Transport.TCP));

/**
 * Redis message pattern decorator
 * @param name - Pattern name
 */
const RedisPattern = (name: unknown) =>
  applyDecorators(MessagePattern(name, Transport.REDIS));

/**
 * MQTT message pattern decorator
 * @param name - Pattern name
 */
const MqttPattern = (name: unknown) =>
  applyDecorators(MessagePattern(name, Transport.MQTT));

/**
 * gRPC message pattern decorator
 * @param name - Pattern name
 */
const GrpcPattern = (name: unknown) =>
  applyDecorators(MessagePattern(name, Transport.GRPC));

/**
 * NATS message pattern decorator
 * @param name - Pattern name
 */
const NatsPattern = (name: unknown) =>
  applyDecorators(MessagePattern(name, Transport.NATS));

/**
 * RabbitMQ message pattern decorator
 * @param name - Pattern name
 */
const RabbitMqPattern = (name: unknown) =>
  applyDecorators(MessagePattern(name, Transport.RMQ));

/**
 * Kafka message pattern decorator
 * @param name - Pattern name
 */
const KafkaPattern = (name: unknown) =>
  applyDecorators(MessagePattern(name, Transport.KAFKA));

export {
  TcpPattern,
  RedisPattern,
  MqttPattern,
  GrpcPattern,
  NatsPattern,
  RabbitMqPattern,
  KafkaPattern,
};
