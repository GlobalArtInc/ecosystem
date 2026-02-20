import { WithWorkflowArgs, Workflow } from "@temporalio/common";
import { Cron, type CronOptions } from "croner";
import { differenceInMilliseconds } from "date-fns";
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
import { sleepUntil } from "./sleep.util";

export const numInvocationsQuery = defineQuery("numInvocationsQuery");
export const futureScheduleQuery = defineQuery("futureScheduleQuery");
export const manualTriggerSignal = defineSignal("manualTriggerSignal");
export type ScheduleWorkflowState = "RUNNING" | "PAUSED" | "STOPPED";
export const stateSignal = defineSignal<[ScheduleWorkflowState]>("stateSignal");
export const stateQuery = defineQuery<ScheduleWorkflowState>("stateQuery");

export type ScheduleOptions = {
  cronParser: {
    expression: string;
    options?: CronOptions;
  };
  maxInvocations?: number;
  jitterMs?: number;
};

export async function ScheduleWorkflow<T extends Workflow>(
  workflowToSchedule: string,
  workflowOptions: WithWorkflowArgs<T, ChildWorkflowOptions>,
  scheduleOptions: ScheduleOptions,
  invocations: number = 1,
) {
  const cron = new Cron(
    scheduleOptions.cronParser.expression,
    scheduleOptions.cronParser.options,
  );
  const nextTime = cron.nextRun();
  if (!nextTime) {
    return;
  }

  setHandler(numInvocationsQuery, () => invocations);
  setHandler(manualTriggerSignal, async () => {
    await executeChild(workflowToSchedule, {
      args: workflowOptions.args,
      workflowId: `scheduled-${invocations++}-${nextTime.toISOString()}`,
      ...workflowOptions,
    });
  });

  let scheduleWorkflowState = "RUNNING" as ScheduleWorkflowState;
  setHandler(stateQuery, () => scheduleWorkflowState);
  setHandler(stateSignal, (state) => void (scheduleWorkflowState = state));

  setHandler(futureScheduleQuery, (numEntriesInFutureSchedule?: number) => {
    const futureCron = new Cron(
      scheduleOptions.cronParser.expression,
      scheduleOptions.cronParser.options,
    );
    return {
      futureSchedule: futureCron
        .nextRuns(numEntriesInFutureSchedule ?? 5)
        .map((d) => d.toISOString()),
      timeLeft: differenceInMilliseconds(nextTime, new Date()),
    };
  });

  try {
    await sleepUntil(nextTime.toISOString());

    if (scheduleOptions.jitterMs) {
      await sleep(Math.floor(Math.random() * (scheduleOptions.jitterMs + 1)));
    }

    if (scheduleWorkflowState === "PAUSED") {
      await condition(() => scheduleWorkflowState === "RUNNING");
    }

    await executeChild(workflowToSchedule, {
      args: workflowOptions.args,
      workflowId: `scheduled-${invocations}-${nextTime.toISOString()}`,
      ...workflowOptions,
    });

    if (
      !scheduleOptions.maxInvocations ||
      invocations < scheduleOptions.maxInvocations
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
