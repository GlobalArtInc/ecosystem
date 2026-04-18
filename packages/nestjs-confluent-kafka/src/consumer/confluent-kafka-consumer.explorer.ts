import { flatten, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { MetadataScanner, ModuleRef } from "@nestjs/core";
import type { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import type { ModulesContainer } from "@nestjs/core/injector/modules-container";
import { KAFKA_SUBSCRIBE_METADATA } from "../constants/confluent-kafka.constants";
import { ConfluentKafkaConsumerRunner } from "./confluent-kafka-consumer.runner";
import type { KafkaSubscribeMetadata } from "../types/confluent-kafka.types";

type ModuleRefWithRootContainer = ModuleRef & {
  readonly container: { getModules(): ModulesContainer };
};

function getModulesContainer(moduleRef: ModuleRef): ModulesContainer {
  return (moduleRef as ModuleRefWithRootContainer).container.getModules();
}

@Injectable()
export class ConfluentKafkaConsumerExplorer implements OnApplicationBootstrap {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly metadataScanner: MetadataScanner,
    private readonly runner: ConfluentKafkaConsumerRunner,
  ) {}

  onApplicationBootstrap(): void {
    for (const wrapper of this.getControllerWrappers()) {
      const { instance } = wrapper;
      if (!instance || !wrapper.metatype) continue;
      if (!this.instanceHasKafkaSubscribe(instance)) continue;
      this.scanInstance(instance);
    }
    void this.runner.start();
  }

  private getControllerWrappers(): InstanceWrapper[] {
    const modules = getModulesContainer(this.moduleRef);
    return flatten([...modules.values()].map((mod) => [...mod.controllers.values()]));
  }

  private instanceHasKafkaSubscribe(instance: object): boolean {
    const rootProto = Object.getPrototypeOf(instance);
    for (const method of this.metadataScanner.getAllMethodNames(rootProto)) {
      if (this.getSubscribeMetadata(instance, method)) return true;
    }
    return false;
  }

  private getSubscribeMetadata(instance: object, method: string): KafkaSubscribeMetadata | undefined {
    let proto: object | null = Object.getPrototypeOf(instance);
    while (proto && proto !== Object.prototype) {
      if (Object.prototype.hasOwnProperty.call(proto, method)) {
        return Reflect.getMetadata(KAFKA_SUBSCRIBE_METADATA, proto, method) as
          | KafkaSubscribeMetadata
          | undefined;
      }
      proto = Reflect.getPrototypeOf(proto);
    }
    return undefined;
  }

  private scanInstance(instance: object): void {
    const rootProto = Object.getPrototypeOf(instance);
    for (const method of this.metadataScanner.getAllMethodNames(rootProto)) {
      const meta = this.getSubscribeMetadata(instance, method);
      if (!meta) continue;
      this.runner.addHandler(
        meta.topic,
        (instance as Record<string, (...args: unknown[]) => Promise<void>>)[method].bind(instance),
        meta.options,
      );
    }
  }
}
