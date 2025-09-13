import { v4 } from "uuid";

export type CommandProps<T> = Omit<T, "correlationId" | "commandId"> &
  Partial<Command>;

export abstract class Command {
  public readonly commandId: string;

  public readonly correlationId: string;

  public readonly causationId?: string;

  constructor(props: CommandProps<unknown>) {
    this.correlationId = props.correlationId ?? v4();
    this.commandId = props.commandId ?? v4();
  }
}
