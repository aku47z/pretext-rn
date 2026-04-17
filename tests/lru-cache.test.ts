import { describe, expect, it } from "vitest";

import { LruCache } from "../src/cache/lruCache";

describe("LruCache", () => {
  it("throws when maxEntries is not a positive integer", () => {
    expect(() => new LruCache<string, number>(0)).toThrow();
    expect(() => new LruCache<string, number>(-1)).toThrow();
    expect(() => new LruCache<string, number>(1.5)).toThrow();
  });

  it("stores and retrieves values", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);

    expect(cache.get("a")).toBe(1);
    expect(cache.has("a")).toBe(true);
  });

  it("returns undefined for missing keys", () => {
    const cache = new LruCache<string, number>(2);

    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts the oldest entry when over capacity", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
  });

  it("moves a key to most-recently-used on get", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);

    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });

  it("updates existing keys without growing size", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.set("a", 9);
    cache.set("b", 2);

    expect(cache.get("a")).toBe(9);
    expect(cache.has("b")).toBe(true);
  });

  it("deletes keys", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.delete("a");

    expect(cache.has("a")).toBe(false);
  });

  it("clears all keys", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();

    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(false);
  });
});
