import type { CacheAdapter } from "../types";

export class NullCache<K, V> implements CacheAdapter<K, V> {
  get(_key: K): V | undefined {
    return undefined;
  }

  set(_key: K, _value: V): void {}

  has(_key: K): boolean {
    return false;
  }

  delete(_key: K): void {}

  clear(): void {}
}
