export interface ProtoToZodOptions {
  /**
   * Name of the package to generate schemas for.
   * If not provided, will try to infer from the proto file.
   */
  packageName?: string;
  /**
   * Whether to generate comments in the output.
   * Default: true
   */
  generateComments?: boolean;
}

export interface GeneratorContext {
  imports: Set<string>;
  schemas: string[];
  enums: string[];
}
