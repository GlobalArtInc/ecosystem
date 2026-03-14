import { SetMetadata } from "@nestjs/common";

import { TEMPORAL_MODULE_ACTIVITY } from "../constants/temporal.constants";

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
