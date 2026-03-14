import { SetMetadata } from "@nestjs/common";

import { TEMPORAL_MODULE_WORKFLOW_METHOD } from "../constants/temporal.constants";

export interface WorkflowMethodOptions {
  name?: string;
}

export const WorkflowMethod = (
  options?: WorkflowMethodOptions,
): MethodDecorator =>
  SetMetadata(TEMPORAL_MODULE_WORKFLOW_METHOD, options || {});
