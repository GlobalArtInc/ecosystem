import { WithWorkflowArgs, Workflow } from "@temporalio/common";
import CronExpressionParser, { type CronExpressionOptions } from "cron-parser";
import { differenceInMilliseconds } from "date-fns";

import { sleepUntil } from "./sleep.util";
import {
  ChildWorkflowOptions,
  condition,
  continueAsNew,
  defineQuery,
  defineSignal,
  executeChild,
  isCancellation,
  setHandler,
  sleep,
} from "@temporalio/workflow";

// queries
export const numInvocationsQuery = defineQuery("numInvocationsQuery");
export const futureScheduleQuery = defineQuery("futureScheduleQuery");
export const manualTriggerSignal = defineSignal("manualTriggerSignal");
export type ScheduleWorkflowState = "RUNNING" | "PAUSED" | "STOPPED";
export const stateSignal = defineSignal<[ScheduleWorkflowState]>("stateSignal");
export const stateQuery = defineQuery<ScheduleWorkflowState>("stateQuery");

export type ScheduleOptions = {
  cronParser: {
    expression: string;
    options?: CronExpressionOptions;
  };
  maxInvocations?: number;
  jitterMs?: number;
};

export async function ScheduleWorkflow<T extends Workflow>(
  /** Name of the child workflow to start */
  workflowToSchedule: string,
  /** Options to start the child workflow with, including ParentClosePolicy */
  workflowOptions: WithWorkflowArgs<T, ChildWorkflowOptions>,
  /** Options that control how the scheduling is done */
  scheduleOptions: ScheduleOptions,
  invocations: number = 1,
) {
  // signal and query handlers
  setHandler(numInvocationsQuery, () => invocations);
  setHandler(manualTriggerSignal, async () => {
    await executeChild(workflowToSchedule, {
      args: workflowOptions.args,
      workflowId: `scheduled-${invocations++}-${nextTime.toString()}`,
      ...workflowOptions,
    });
  });
  let scheduleWorkflowState = "RUNNING" as ScheduleWorkflowState;
  setHandler(stateQuery, () => scheduleWorkflowState);
  setHandler(stateSignal, (state) => void (scheduleWorkflowState = state));

  const interval = CronExpressionParser.parse(
    scheduleOptions.cronParser.expression,
    scheduleOptions.cronParser.options,
  );
  const nextTime = interval.next().toString();
  setHandler(futureScheduleQuery, (numEntriesInFutureSchedule?: number) => {
    const interval = CronExpressionParser.parse(
      scheduleOptions.cronParser.expression,
      scheduleOptions.cronParser.options,
    );
    return {
      futureSchedule: genNextTimes(numEntriesInFutureSchedule, () =>
        interval.next().toString(),
      ),
      timeLeft: differenceInMilliseconds(new Date(nextTime), new Date()),
    };
  });

  // timer logic
  try {
    await sleepUntil(nextTime);
    if (scheduleOptions.jitterMs) {
      await sleep(Math.floor(Math.random() * (scheduleOptions.jitterMs + 1)));
    }
    if (scheduleWorkflowState === "PAUSED") {
      await condition(() => scheduleWorkflowState === "RUNNING");
    }
    executeChild(workflowToSchedule, {
      args: workflowOptions.args,
      workflowId: `scheduled-${invocations}-${nextTime.toString()}`,
      ...workflowOptions,
      // // regular workflow options apply here, with two additions (defaults shown):
      // cancellationType: ChildWorkflowCancellationType.WAIT_CANCELLATION_COMPLETED,
      // parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_TERMINATE
    });
    if (
      scheduleOptions.maxInvocations &&
      scheduleOptions.maxInvocations > invocations
    ) {
      await continueAsNew(
        workflowToSchedule,
        workflowOptions,
        scheduleOptions,
        invocations + 1,
      );
    } else {
      scheduleWorkflowState = "STOPPED";
    }
  } catch (err) {
    if (isCancellation(err)) scheduleWorkflowState = "STOPPED";
    else throw err;
  }
}

// shared
function genNextTimes<T extends string | Date>(
  number = 5,
  getNextTimes: () => T,
): T[] {
  const times = [];
  for (let i = 0; i < number; i++) {
    times.push(getNextTimes());
  }
  return times;
}
