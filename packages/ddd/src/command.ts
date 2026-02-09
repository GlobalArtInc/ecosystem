import { v4 } from "uuid";
import {
  type IEnvelope,
  type IMessageMetadata,
  BaseEnvelope,
} from "./envelope";
import { z } from "zod";

export type CommandProps<T> = Omit<T, "correlationId" | "commandId"> &
  Partial<Command>;

export const commandSchema = <
  TName extends string,
  TPayload extends z.ZodTypeAny,
>(
  commandName: TName,
  payload: TPayload,
) =>
  z.object({
    id: z.uuid(),
    command: z.literal(commandName),
    payload: payload,
  });

export abstract class Command {
  public readonly commandId: string;
  public readonly correlationId: string;
  public readonly causationId?: string;
  public readonly topic?: string;

  constructor(props: CommandProps<unknown>) {
    this.correlationId = props.correlationId ?? v4();
    this.commandId = props.commandId ?? v4();
    this.topic = props.topic;
  }
}

export interface IEnvelopeCommand<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IMessageMetadata = IMessageMetadata,
> extends IEnvelope<TPayload, TMeta> {
  command: TName;
}

export interface IEnvelopeCommandJSON<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IMessageMetadata = IMessageMetadata,
> {
  id: string;
  command: TName;
  payload: TPayload;
  meta: TMeta;
}

export abstract class BaseCommand<
  TName extends string,
  TPayload extends object = object,
  TMeta extends IMessageMetadata = IMessageMetadata,
>
  extends BaseEnvelope<TPayload, TMeta>
  implements IEnvelopeCommand<TName, TPayload, TMeta>
{
  public readonly command: TName;
  public readonly topic?: string;

  constructor(
    command: TName,
    payload: TPayload,
    meta: TMeta = { keys: {}, headers: {} } as TMeta,
    id = v4(),
    topic?: string,
  ) {
    super(payload, meta, id);
    this.command = command;
    this.topic = topic;
  }

  toJSON(): IEnvelopeCommandJSON<TName, TPayload, TMeta> {
    return {
      id: this.id,
      command: this.command,
      payload: this.payload,
      meta: this.meta,
    };
  }
}

const CREATE_USER_COMMAND = "CreateUser" as const;

class CreateUser extends BaseCommand<
  typeof CREATE_USER_COMMAND,
  { name: string }
> {
  constructor(name: string) {
    super(CREATE_USER_COMMAND, { name });
  }
}
