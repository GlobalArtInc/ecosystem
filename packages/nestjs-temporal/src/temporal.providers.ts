import { Provider } from '@nestjs/common';
import { Connection, WorkflowClient } from '@temporalio/client';

import { SharedWorkflowClientConfig } from './interfaces';
import { getQueueToken, getWorkflowClient } from './utils';

/**
 * Builds a WorkflowClient from the provided options.
 * If connection options are provided, establishes a connection first.
 *
 * @param option - Shared workflow client config containing connection and workflow options
 * @returns A configured WorkflowClient instance
 */
export async function buildClient(
  option: SharedWorkflowClientConfig,
): Promise<WorkflowClient> {
  if (option.connection) {
    const connection = await Connection.connect(option.connection);
    return getWorkflowClient({
      ...option.workflowOptions,
      connection,
    });
  }

  return getWorkflowClient(option.workflowOptions);
}

/**
 * Creates a provider for a Temporal WorkflowClient.
 *
 * @param option - Shared workflow client config
 * @returns A NestJS provider for the WorkflowClient
 */
export function createClientProvider(
  option: SharedWorkflowClientConfig,
): Provider {
  return {
    provide: getQueueToken(option?.name || undefined),
    useFactory: async (): Promise<WorkflowClient> => {
      return buildClient(option || {});
    },
  };
}
