import { WorkflowClient, WorkflowClientOptions, WorkflowExecutionDescription, WorkflowHandle, WorkflowNotFoundError } from "@temporalio/client";

export class TemporalWorkflowClient extends WorkflowClient {
  constructor(options?: WorkflowClientOptions) {
    super(options);
  }

  public async describeWorkflow(workflowId: string): Promise<{ info: WorkflowExecutionDescription, handle: WorkflowHandle } | null> {
    const handle = this.getHandle(workflowId);

    try {
      return {
        info: await handle.describe(),
        handle,
      };
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) {
        return null;
      }
      throw error;
    }
  }
}