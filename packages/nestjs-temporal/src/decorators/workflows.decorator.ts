import { Scope, SetMetadata } from "@nestjs/common";
import { SCOPE_OPTIONS_METADATA } from "@nestjs/common/constants";

import { TEMPORAL_MODULE_WORKFLOW } from "../constants/temporal.constants";

export interface WorkflowsOptions {
  /**
   * Specifies the name of the queue to subscribe to.
   */
  name?: string;
  /**
   * Specifies the lifetime of an injected Processor.
   */
  scope?: Scope;
}

export const Workflows =
  (options?: WorkflowsOptions): ClassDecorator =>
  (target: Function) => {
    SetMetadata(SCOPE_OPTIONS_METADATA, options)(target);
    SetMetadata(TEMPORAL_MODULE_WORKFLOW, options)(target);
  };
