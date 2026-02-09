import { z } from "zod";
import {
  type IEnvelope,
  type IMessageMetadata,
  BaseEnvelope,
} from "./envelope";
import { v4 } from "uuid";

export type { IMessageMetadata as IEventMetadata } from "./envelope";

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

export interface IEvent<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IMessageMetadata = IMessageMetadata,
> extends IEnvelope<TPayload, TMeta> {
  event: TName;
  timestamp: Date;
}

export interface IEventJSON<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IMessageMetadata = IMessageMetadata,
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
  TMeta extends IMessageMetadata = IMessageMetadata,
> extends BaseEnvelope<TPayload, TMeta> implements IEvent<TName, TPayload, TMeta> {
  public readonly event: TName;
  public readonly timestamp: Date;

  constructor(
    event: TName,
    payload: TPayload,
    meta: TMeta = { keys: {}, headers: {} } as TMeta,
    id = v4(),
    timestamp = new Date(),
  ) {
    super(payload, meta, id);
    this.event = event;
    this.timestamp = timestamp;
  }

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
