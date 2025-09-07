import { v4 } from 'uuid';
import { z } from 'zod';

export const eventSchema = <TName extends string, TPayload extends z.ZodTypeAny, TMeta extends z.ZodTypeAny>(
  name: TName,
  payload: TPayload,
  meta: TMeta,
) =>
  z.object({
    id: z.string().uuid(),
    name: z.literal(name),
    operatorId: z.string().optional(),
    payload: payload,
    timestamp: z.coerce.date(),
    meta: meta,
  });

export interface IEvent<TPayload extends object = object, TMeta = any> {
  id: string;
  name: string;
  operatorId: string;
  payload: TPayload;
  timestamp: Date;
  meta: TMeta;
}

export interface IEventJSON<TPayload extends object = object, TMeta = any> {
  id: string;
  name: string;
  operatorId: string;
  payload: TPayload;
  timestamp: string;
  meta: TMeta;
}

export abstract class BaseEvent<
  TPayload extends object = object,
  TName extends string = string,
  TMeta extends any = { key?: string; headers?: Record<string, string> },
> implements IEvent<TPayload>
{
  abstract name: TName;
  constructor(
    public readonly payload: TPayload,
    public readonly operatorId: string,
    public readonly meta: TMeta,
    public readonly id = v4(),
    public readonly timestamp = new Date(),
  ) {}

  toJSON(): IEventJSON<TPayload, TMeta> {
    return {
      id: this.id,
      name: this.name,
      operatorId: this.operatorId,
      timestamp: this.timestamp.toISOString(),
      payload: this.payload,
      meta: this.meta,
    };
  }
}
