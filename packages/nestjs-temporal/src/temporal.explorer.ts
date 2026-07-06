import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  DiscoveryService,
  MetadataScanner,
  ExternalContextCreator,
} from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { lastValueFrom, isObservable } from "rxjs";
import {
  NativeConnection,
  NativeConnectionOptions,
  Runtime,
  RuntimeOptions,
  Worker,
  WorkerOptions,
} from "@temporalio/worker";
import { TemporalMetadataAccessor } from "./temporal-metadata.accessors";
import {
  TEMPORAL_MODULE_OPTIONS_TOKEN,
  type TemporalModuleOptions,
} from "./temporal.module-definition";
import {
  TEMPORAL_ARGS_METADATA,
  TEMPORAL_CONTEXT_METADATA,
} from "./constants/temporal.constants";
import { TemporalParamsFactory } from "./temporal-params.factory";
import { Context } from "@temporalio/activity";
import {
  DuplicateActivityError,
  TemporalConnectionError,
  TemporalWorkerCreationError,
  UnsupportedActivityScopeError,
} from "./errors";

/**
 * TemporalExplorer is responsible for discovering and registering Temporal activities
 * and creating the Temporal worker instance.
 *
 * It scans the NestJS application for classes decorated with @Activities() and methods
 * decorated with @Activity(), then registers them with the Temporal worker.
 */
@Injectable()
export class TemporalExplorer
  implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap
{
  @Inject(TEMPORAL_MODULE_OPTIONS_TOKEN)
  private readonly options!: TemporalModuleOptions;
  private readonly logger = new Logger(TemporalExplorer.name);
  private workers?: Worker[];
  private workerRunPromises?: Promise<void>[];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataAccessor: TemporalMetadataAccessor,
    private readonly metadataScanner: MetadataScanner,
    private readonly externalContextCreator: ExternalContextCreator,
  ) {}

  /**
   * Initializes the module by exploring and setting up the Temporal worker.
   */
  async onModuleInit(): Promise<void> {
    await this.explore();
  }

  /**
   * Shuts down the Temporal worker when the module is destroyed.
   */
  async onModuleDestroy(): Promise<void> {
    if (!this.workers) {
      return;
    }

    this.workers.forEach((worker) => {
      try {
        worker.shutdown();
      } catch (err: unknown) {
        this.logger.warn(`Failed to signal shutdown for a Temporal worker.`, {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    });

    if (this.workerRunPromises) {
      const results = await Promise.allSettled(this.workerRunPromises);
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          this.logger.warn(`Temporal worker #${index} was not cleanly shutdown.`, {
            err:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
      });
    }
  }

  /**
   * Starts the Temporal worker when the application is fully bootstrapped.
   */
  onApplicationBootstrap(): void {
    if (this.workers) {
      this.workerRunPromises = this.workers.map((worker) => worker.run());
    }
  }

  /**
   * Explores the application for Temporal activities and creates the worker.
   * This method is called during module initialization.
   */
  async explore(): Promise<void> {
    const workerConfig = this.getWorkerConfigOptions();
    const runTimeOptions = this.getRuntimeOptions();
    const connectionOptions = this.getNativeConnectionOptions();

    // Worker must have a taskQueue configured
    if (!workerConfig.some((config) => config.taskQueue)) {
      this.logger.warn(
        "Temporal worker configuration missing taskQueue. Worker will not be created.",
      );
      return;
    }

    this.findDuplicateActivityMethods();

    const activitiesFunc = await this.handleActivities();

    if (runTimeOptions) {
      this.logger.verbose("Instantiating a new Runtime object");
      Runtime.install(runTimeOptions);
    }

    const sharedWorkerOptions: Partial<WorkerOptions> = {
      activities: activitiesFunc,
    };

    if (connectionOptions) {
      this.logger.verbose("Connecting to the Temporal server");
      try {
        sharedWorkerOptions.connection =
          await NativeConnection.connect(connectionOptions);
      } catch (err: unknown) {
        throw new TemporalConnectionError(err);
      }
    }

    this.logger.verbose("Creating a new Worker");
    this.workers = await Promise.all(
      workerConfig.map(({ activities: configActivities, ...config }) =>
        Worker.create({
          ...sharedWorkerOptions,
          ...config,
          activities: { ...activitiesFunc, ...(configActivities as Record<string, Function>) },
        }).catch((err: unknown) => {
          throw new TemporalWorkerCreationError(config.taskQueue, err);
        }),
      ),
    );
  }

  /**
   * Gets the worker configuration options.
   */
  getWorkerConfigOptions(): WorkerOptions[] {
    return this.options.workerOptions;
  }

  /**
   * Gets the native connection options for the Temporal server.
   */
  getNativeConnectionOptions(): NativeConnectionOptions | undefined {
    return this.options.connectionOptions;
  }

  /**
   * Gets the runtime options for the Temporal worker.
   */
  getRuntimeOptions(): RuntimeOptions | undefined {
    return this.options.runtimeOptions;
  }

  /**
   * Gets the activity classes to register with this worker.
   * If undefined, all discovered activities will be registered.
   * Can be either class constructors or InstanceWrappers.
   */
  private getActivityClasses(): (InstanceWrapper | Function)[] | undefined {
    return this.options.activityClasses as
      | (InstanceWrapper | Function)[]
      | undefined;
  }

  /**
   * Validates that activity method names are unique across all activity classes.
   * Throws an error if duplicates are found and errorOnDuplicateActivities is enabled.
   */
  findDuplicateActivityMethods(): void {
    if (!this.options.errorOnDuplicateActivities) {
      return;
    }

    const activityClasses = this.getActivityClasses();
    if (!activityClasses || activityClasses.length === 0) {
      return;
    }

    const activityMethods: Record<string, string[]> = {};

    activityClasses.forEach((classOrWrapper: InstanceWrapper | Function) => {
      // Handle both InstanceWrapper and class constructor
      const wrapper = classOrWrapper as InstanceWrapper;
      const instance =
        "instance" in wrapper && wrapper.instance
          ? wrapper.instance
          : new (classOrWrapper as new () => unknown)();

      this.metadataScanner
        .getAllMethodNames(Object.getPrototypeOf(instance))
        .forEach((key) => {
          if (this.metadataAccessor.isActivity(instance[key])) {
            const activityOptions = this.metadataAccessor.getActivity(
              instance[key],
            ) as { name?: string } | undefined;
            const activityName = activityOptions?.name || key;
            activityMethods[activityName] = (
              activityMethods[activityName] || []
            ).concat(instance.constructor.name);
          }
        });
    });

    const violations = Object.entries(activityMethods).filter(
      ([, classes]) => classes.length > 1,
    );

    if (violations.length > 0) {
      const error = new DuplicateActivityError(Object.fromEntries(violations));
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Discovers and binds all activity methods from classes decorated with @Activities().
   * Returns an object mapping activity method names to their bound implementations.
   */
  async handleActivities(): Promise<Record<string, Function>> {
    const activitiesMethod: Record<string, Function> = {};

    const activityClasses = this.getActivityClasses();
    const activities: InstanceWrapper[] = this.discoveryService
      .getProviders()
      .filter(
        (wrapper: InstanceWrapper) =>
          this.metadataAccessor.isActivities(
            !wrapper.metatype || wrapper.inject
              ? wrapper.instance?.constructor
              : wrapper.metatype,
          ) &&
          (!activityClasses ||
            activityClasses.some(
              (cls) =>
                cls === wrapper.metatype ||
                (cls instanceof Object &&
                  "metatype" in cls &&
                  (cls as InstanceWrapper).metatype === wrapper.metatype),
            )),
      );

    activities.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;
      const isRequestScoped = !wrapper.isDependencyTreeStatic();

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (key: string) => {
          if (this.metadataAccessor.isActivity(instance[key])) {
            if (isRequestScoped) {
              throw new UnsupportedActivityScopeError(
                key,
                instance.constructor.name,
              );
            }

            const activityOptions = this.metadataAccessor.getActivity(
              instance[key],
            ) as { name?: string } | undefined;
            const activityName = activityOptions?.name || key;

            const paramsFactory = new TemporalParamsFactory(
              instance,
              instance[key],
            );

            const handler = this.externalContextCreator.create(
              instance,
              instance[key],
              key,
              TEMPORAL_ARGS_METADATA,
              paramsFactory,
              undefined,
              undefined,
              undefined,
              "temporal",
            );

            if (activitiesMethod[activityName]) {
              this.logger.warn(
                `Activity "${activityName}" from class "${instance.constructor.name}" overrides a previously registered activity with the same name. Enable errorOnDuplicateActivities to fail fast on this instead.`,
              );
            }

            activitiesMethod[activityName] = async (...args: unknown[]) => {
              const ctx = Context.current();
              const result = handler(...args, ctx.info);

              const { heartbeatTimeoutMs } = ctx.info;
              let interval: NodeJS.Timeout | undefined;
              if (heartbeatTimeoutMs) {
                interval = setInterval(
                  () => {
                    try {
                      ctx.heartbeat();
                    } catch (error) {
                      this.logger.warn(
                        `Failed to send heartbeat for activity "${activityName}": ${error}`,
                      );
                    }
                  },
                  Math.min(heartbeatTimeoutMs / 2, 30000),
                );
              }

              try {
                return isObservable(result)
                  ? await lastValueFrom(result)
                  : await result;
              } finally {
                clearInterval(interval);
              }
            };
          }
        },
      );
    });
    return activitiesMethod;
  }
}
