import { type BaseEvent } from "./event";

export abstract class AggregateRoot<E extends BaseEvent<any, any, any>> {
  #domainEvents: E[] = [];

  get domainEvents() {
    return this.#domainEvents;
  }

  set domainEvents(events: E[]) {
    this.#domainEvents = events;
  }

  addDomainEvent(event: E) {
    this.#domainEvents.push(event);
  }

  removeEvents(events: E[]) {
    this.#domainEvents = this.#domainEvents.filter(
      (event) => !events.includes(event),
    );
  }
}
