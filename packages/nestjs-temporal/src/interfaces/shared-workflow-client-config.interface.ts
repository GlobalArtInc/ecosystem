import { ConnectionOptions, WorkflowClientOptions } from '@temporalio/client';

export interface SharedWorkflowClientConfig {
  name?: string;
  connection?: ConnectionOptions;
  workflowOptions?: WorkflowClientOptions;
}
