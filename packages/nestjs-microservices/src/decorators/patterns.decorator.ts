import { applyDecorators } from "@nestjs/common";
import { MessagePattern, Transport } from "@nestjs/microservices";

/**
 * TCP message pattern decorator
 * @param name - Pattern name
 */
const TcpPattern = (name: string) =>
  applyDecorators(MessagePattern(name, Transport.TCP));

/**
 * Redis message pattern decorator
 * @param name - Pattern name
 */
const RedisPattern = (name: string) =>
  applyDecorators(MessagePattern(name, Transport.REDIS));

/**
 * MQTT message pattern decorator
 * @param name - Pattern name
 */
const MqttPattern = (name: string) =>
  applyDecorators(MessagePattern(name, Transport.MQTT));

/**
 * gRPC message pattern decorator
 * @param name - Pattern name
 */
const GrpcPattern = (name: string) =>
  applyDecorators(MessagePattern(name, Transport.GRPC));

/**
 * NATS message pattern decorator
 * @param name - Pattern name
 */
const NatsPattern = (name: string) =>
  applyDecorators(MessagePattern(name, Transport.NATS));

/**
 * RabbitMQ message pattern decorator
 * @param name - Pattern name
 */
const RabbitMqPattern = (name: string) =>
  applyDecorators(MessagePattern(name, Transport.RMQ));

/**
 * Kafka message pattern decorator
 * @param name - Pattern name
 */
const KafkaPattern = (name: string) =>
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
