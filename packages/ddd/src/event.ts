import { v4 } from "uuid";
import { z } from "zod";

export const eventSchema = <
  TName extends string,
  TPayload extends z.ZodTypeAny,
>(
  eventName: TName,
  payload: TPayload,
) =>
  z.object({
    id: z.uuid(),
    event: z.literal(eventName),
    payload: payload,
    timestamp: z.coerce.date(),
  });

export interface IEventMetadata {
  keys?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

export interface IEvent<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IEventMetadata = IEventMetadata,
> {
  id: string;
  event: TName;
  payload: TPayload;
  meta: TMeta;
  timestamp: Date;
}

export interface IEventJSON<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IEventMetadata = IEventMetadata,
> {
  id: string;
  event: TName;
  payload: TPayload;
  timestamp: string;
  meta: TMeta;
}

export abstract class BaseEvent<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IEventMetadata = IEventMetadata,
> implements IEvent<TName, TPayload, TMeta> {
  constructor(
    public readonly event: TName,
    public readonly payload: TPayload,
    public readonly meta: TMeta = {
      keys: {},
      headers: {},
    } as TMeta,
    public readonly id = v4(),
    public readonly timestamp = new Date(),
  ) {}

  toJSON(): IEventJSON<TName, TPayload, TMeta> {
    return {
      id: this.id,
      event: this.event,
      timestamp: this.timestamp.toISOString(),
      payload: this.payload,
      meta: this.meta,
    };
  }
}
