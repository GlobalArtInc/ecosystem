import { DynamicModule } from '@nestjs/common';
import { WorkerOptions } from '@temporalio/worker';

import { SharedWorkerAsyncConfiguration } from './shared-worker-config.interface';
import { SharedWorkflowClientConfig } from './shared-workflow-client-config.interface';
import { SharedWorkflowClientOptions } from './shared-workflow-client-options.interface';

export interface ITemporalModule {
  registerWorker(workerConfig: WorkerOptions): DynamicModule;
  registerWorkerAsync(
    asyncWorkerConfig: SharedWorkerAsyncConfiguration,
  ): DynamicModule;
  registerClient(options: SharedWorkflowClientConfig): DynamicModule;
  registerClientAsync(options: SharedWorkflowClientOptions): DynamicModule;
}
