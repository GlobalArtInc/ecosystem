import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class ContextService {
  private readonly als = new AsyncLocalStorage<Map<string, any>>();

  run(fn: () => void) {
    const store = new Map<string, any>();
    this.als.run(store, fn);
  }

  set(key: string, value: any) {
    const store = this.als.getStore();
    if (store) {
      store.set(key, value);
    }
  }

  get<T>(key: string): T | undefined {
    return this.als.getStore()?.get(key);
  }
}

