import { Scope, SetMetadata } from "@nestjs/common";
import { SCOPE_OPTIONS_METADATA } from "@nestjs/common/constants";

import {
  TEMPORAL_MODULE_ACTIVITIES,
  TEMPORAL_MODULE_ACTIVITY,
} from "../constants/temporal.constants";

/**
 * Options for the @Activities() decorator.
 */
export interface ActivitiesOptions extends ActivityOptions {
  /**
   * Specifies the name of the queue to subscribe to.
   */
  name?: string;
  /**
   * Specifies the lifetime of an injected Activities class.
   */
  scope?: Scope;
}

/**
 * Options for the @Activity() decorator.
 */
export interface ActivityOptions {
  /**
   * Custom name for the activity. If not provided, the method name is used.
   */
  name?: string;
}

/**
 * Marks a class as containing Temporal activities.
 * Methods within this class decorated with @Activity() will be registered as Temporal activities.
 *
 * @param queueNameOrOptions - Optional queue name (string) or options object
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * @Activities()
 * export class MyActivities {
 *   @Activity()
 *   async doSomething() { }
 * }
 * ```
 */
export const Activities =
  (options?: ActivitiesOptions): ClassDecorator =>
  (target: Function) => {
    SetMetadata(SCOPE_OPTIONS_METADATA, options)(target);
    SetMetadata(TEMPORAL_MODULE_ACTIVITIES, options ?? {})(target);
  };

/**
 * Marks a method as a Temporal activity.
 * The method must be within a class decorated with @Activities().
 *
 * @param nameOrOptions - Optional activity name (string) or options object
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Activity()
 * async processOrder(orderId: string) { }
 *
 * @Activity('custom-activity-name')
 * async anotherActivity() { }
 * ```
 */
export const Activity = (options?: ActivityOptions): MethodDecorator =>
  SetMetadata(TEMPORAL_MODULE_ACTIVITY, options || {});
