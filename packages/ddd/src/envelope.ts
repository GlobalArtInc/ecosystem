import { v4 } from "uuid";

export interface IMessageMetadata {
  keys?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

export interface IEnvelope<
  TPayload extends object = object,
  TMeta extends IMessageMetadata = IMessageMetadata,
> {
  id: string;
  payload: TPayload;
  meta: TMeta;
}

const defaultMeta = {
  keys: {},
  headers: {},
} as IMessageMetadata;

export abstract class BaseEnvelope<
  TPayload extends object = object,
  TMeta extends IMessageMetadata = IMessageMetadata,
> implements IEnvelope<TPayload, TMeta> {
  constructor(
    public readonly payload: TPayload,
    public readonly meta: TMeta = defaultMeta as TMeta,
    public readonly id = v4(),
  ) {}
}
