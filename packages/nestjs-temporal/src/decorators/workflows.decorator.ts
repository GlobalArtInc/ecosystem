import { SetMetadata } from "@nestjs/common";

import {
  TEMPORAL_MODULE_WORKFLOW,
  TEMPORAL_MODULE_WORKFLOWS,
} from "../constants/temporal.constants";

interface AwsWorkflowBundleOptions {
  /**
   * Path to the workflow bundle files
   */
  workflowBundlePath: string;

  /**
   * Bucket name to download old versions from the s3 storage,
   * if not provided will be used the default bucket name from the deployment worker settings
   */
  bucketName: string;
}

export interface WorkflowsOptions {
  /**
   * Specifies the name of the queue to subscribe to.
   */
  name?: string;

  /**
   * Path to the workflow class module for bundling.
   * Used to generate workflow bundle. Required when using @Workflows with automatic bundle generation.
   */
  path?: string;

  /**
   * Whenever we download old versions from s3 storage and create new worker with old versions
   * This is optional, if not provided, deployment worker settings will be used
   */
  awsWorkflowBundle?: AwsWorkflowBundleOptions;
}

export interface WorkflowOptions {
  name?: string;
}

export const Workflows =
  (options?: WorkflowsOptions): ClassDecorator =>
  (target: Function) => {
    SetMetadata(TEMPORAL_MODULE_WORKFLOWS, options)(target);
  };

export const Workflow = (options?: WorkflowOptions): MethodDecorator =>
  SetMetadata(TEMPORAL_MODULE_WORKFLOW, options || {});
