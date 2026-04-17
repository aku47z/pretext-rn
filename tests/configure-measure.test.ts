import { beforeEach, describe, expect, it, vi } from "vitest";

type MeasureModule = typeof import("../src/measureHeight");
type ReactNativeMockModule = typeof import("react-native");

class SpyCache {
  private map = new Map<string, number>();
  readonly getSpy = vi.fn((key: string) => this.map.get(key));
  readonly setSpy = vi.fn((key: string, value: number) => {
    this.map.set(key, value);
  });

  get(key: string): number | undefined {
    return this.getSpy(key);
  }

  set(key: string, value: number): void {
    this.setSpy(key, value);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

async function loadMeasureModule(): Promise<MeasureModule> {
  vi.resetModules();
  return import("../src/measureHeight");
}

async function loadReactNativeMock(): Promise<ReactNativeMockModule> {
  return import("react-native");
}

describe("configureMeasure behavior", () => {
  beforeEach(async () => {
    const reactNativeMock = await loadReactNativeMock();
    reactNativeMock.__resetReactNativeMock();
    delete (globalThis as Record<string, unknown>).__pretextMeasureHeight;
    delete (globalThis as Record<string, unknown>).devicePixelRatio;
    vi.restoreAllMocks();
  });

  it("throws when fallbackPolicy is throw and native throws", async () => {
    (globalThis as Record<string, unknown>).__pretextMeasureHeight = vi.fn(
      () => {
        throw new Error("native failed");
      },
    );

    const { configureMeasure, measureHeight } = await loadMeasureModule();
    configureMeasure({ fallbackPolicy: "throw", roundToPixel: false });

    expect(() => measureHeight("hello", { fontSize: 16 }, 200)).toThrow(
      "native failed",
    );
  });

  it("falls back to approximate when fallbackPolicy is approximate", async () => {
    (globalThis as Record<string, unknown>).__pretextMeasureHeight = vi.fn(
      () => {
        throw new Error("native failed");
      },
    );

    const { configureMeasure, measureHeight } = await loadMeasureModule();
    configureMeasure({ fallbackPolicy: "approximate", roundToPixel: false });

    const measured = measureHeight("hello world", { fontSize: 10 }, 50);

    expect(measured).toBeGreaterThan(0);
  });

  it("applies roundToPixel=true", async () => {
    (globalThis as Record<string, unknown>).__pretextMeasureHeight = vi.fn(
      () => 16.3,
    );
    (globalThis as Record<string, unknown>).devicePixelRatio = 3;

    const { configureMeasure, measureHeight, clearCache } =
      await loadMeasureModule();
    configureMeasure({ roundToPixel: true });
    clearCache();

    const measured = measureHeight("hello", { fontSize: 16 }, 200);

    expect(measured).toBeCloseTo(49 / 3, 10);
  });

  it("applies roundToPixel=false", async () => {
    (globalThis as Record<string, unknown>).__pretextMeasureHeight = vi.fn(
      () => 16.3,
    );
    (globalThis as Record<string, unknown>).devicePixelRatio = 3;

    const { configureMeasure, measureHeight, clearCache } =
      await loadMeasureModule();
    configureMeasure({ roundToPixel: false });
    clearCache();

    const measured = measureHeight("hello", { fontSize: 16 }, 200);

    expect(measured).toBe(16.3);
  });

  it("uses a custom cache adapter when provided", async () => {
    const nativeMeasure = vi.fn(() => 42);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const cache = new SpyCache();
    const { configureMeasure, measureHeight, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cache, roundToPixel: false });
    clearCache();

    const first = measureHeight("hello", { fontSize: 16 }, 200);
    const second = measureHeight("hello", { fontSize: 16 }, 200);

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(nativeMeasure).toHaveBeenCalledTimes(1);
    expect(cache.getSpy).toHaveBeenCalledTimes(2);
    expect(cache.setSpy).toHaveBeenCalledTimes(1);
  });

  it("respects cacheSize by evicting old values", async () => {
    const nativeMeasure = vi.fn(
      (payload: { text: string }) => payload.text.length,
    );
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { configureMeasure, measureHeight, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 1, roundToPixel: false });
    clearCache();

    measureHeight("a", { fontSize: 16 }, 200);
    measureHeight("bb", { fontSize: 16 }, 200);
    measureHeight("a", { fontSize: 16 }, 200);

    expect(nativeMeasure).toHaveBeenCalledTimes(3);
  });

  it("reports native availability state correctly", async () => {
    const { isNativeMeasureAvailable } = await loadMeasureModule();
    expect(isNativeMeasureAvailable()).toBe(false);

    (globalThis as Record<string, unknown>).__pretextMeasureHeight = vi.fn(
      () => 11,
    );
    const reloaded = await loadMeasureModule();

    expect(reloaded.isNativeMeasureAvailable()).toBe(true);
  });

  it("clears cache via public clearCache API", async () => {
    const nativeMeasure = vi.fn(() => 21);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { configureMeasure, measureHeight, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 64, roundToPixel: false });
    measureHeight("hello", { fontSize: 16 }, 200);
    measureHeight("hello", { fontSize: 16 }, 200);
    clearCache();
    measureHeight("hello", { fontSize: 16 }, 200);

    expect(nativeMeasure).toHaveBeenCalledTimes(2);
  });

  it("normalizes non-positive widths to 1", async () => {
    const nativeMeasure = vi.fn((payload: { width: number }) => payload.width);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { configureMeasure, measureHeight, clearCache } =
      await loadMeasureModule();

    configureMeasure({ roundToPixel: false });
    clearCache();

    const fromZero = measureHeight("x", { fontSize: 16 }, 0);
    const fromNegative = measureHeight("x", { fontSize: 16 }, -20);

    expect(fromZero).toBe(1);
    expect(fromNegative).toBe(1);
    expect(nativeMeasure).toHaveBeenCalledTimes(1);
    expect(nativeMeasure).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1 }),
    );
  });

  it("throws on invalid width values", async () => {
    const { configureMeasure, measureHeight } = await loadMeasureModule();

    configureMeasure({ roundToPixel: false });

    expect(() => measureHeight("x", { fontSize: 16 }, Number.NaN)).toThrow(
      "measureHeight width must be a finite number.",
    );
  });

  it("throws on invalid fontSize values", async () => {
    const { configureMeasure, measureHeight } = await loadMeasureModule();

    configureMeasure({ roundToPixel: false });

    expect(() => measureHeight("x", { fontSize: 0 }, 100)).toThrow(
      "measureHeight style.fontSize must be a positive finite number.",
    );
  });
});
