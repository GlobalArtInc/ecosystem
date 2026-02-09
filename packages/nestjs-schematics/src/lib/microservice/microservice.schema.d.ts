export interface MicroserviceOptions {
  /**
   * Nest microservice name.
   */
  // NOTE: We could have a `number` here due to this issue: https://github.com/nestjs/nest-cli/issues/1519
  name: string | number;
  /**
   * Nest microservice author.
   */
  author?: string;
  /**
   * Nest microservice description.
   */
  description?: string;
  /**
   * Nest microservice destination directory.
   */
  directory?: string;
  /**
   * With TypeScript strict mode.
   */
  strict?: boolean;
  /**
   * Nest microservice version.
   */
  version?: string;
  /**
   * Nest microservice language.
   */
  language?: string;
  /**
   * The used package manager.
   */
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'undefined';
  /**
   * Nest included production dependencies (comma separated values).
   */
  dependencies?: string;
  /**
   * Nest included development dependencies (comma separated values).
   */
  devDependencies?: string;
  /**
   * Specifies if a spec file is generated.
   */
  spec?: boolean;
  /**
   * Specifies the file suffix of spec files.
   * @default "spec"
   */
  specFileSuffix?: string;
}