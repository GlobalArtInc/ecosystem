import { type BaseEnvelope } from "./envelope";

export abstract class AggregateRoot<
  E extends BaseEnvelope<object, object>,
> {
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
