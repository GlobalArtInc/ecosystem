import type { AggregateRoot } from "./aggregate-root";
export interface IOutboxService<DO extends AggregateRoot<any>> {
  save(d: DO): Promise<void>;
  saveMany(d: DO[]): Promise<void>;
  sendToKafka(d: DO): Promise<void>;
  sendToKafkaMany(d: DO[]): Promise<void>;
}
