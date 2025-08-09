import { Injectable } from "@nestjs/common";

@Injectable()
export class ContextCollector {
  private static contexts = new Set<string>();

  static addContext(context: string): void {
    this.contexts.add(context);
  }

  static getContexts(): string[] {
    return Array.from(this.contexts);
  }

  static clearContexts(): void {
    this.contexts.clear();
  }
}
