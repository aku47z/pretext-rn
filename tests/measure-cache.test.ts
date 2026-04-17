import { beforeEach, describe, expect, it, vi } from "vitest";

type MeasureModule = typeof import("../src/measureHeight");
type ReactNativeMockModule = typeof import("react-native");

async function loadMeasureModule(): Promise<MeasureModule> {
  vi.resetModules();
  return import("../src/measureHeight");
}

async function loadReactNativeMock(): Promise<ReactNativeMockModule> {
  return import("react-native");
}

describe("measureHeight cache behavior", () => {
  beforeEach(async () => {
    const reactNativeMock = await loadReactNativeMock();
    reactNativeMock.__resetReactNativeMock();
    delete (globalThis as Record<string, unknown>).__pretextMeasureHeight;
  });

  it("uses cache for identical inputs", async () => {
    const nativeMeasure = vi.fn(() => 42);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 128, roundToPixel: false });
    clearCache();

    const first = measureHeight("hello", { fontSize: 16 }, 200);
    const second = measureHeight("hello", { fontSize: 16 }, 200);

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(nativeMeasure).toHaveBeenCalledTimes(1);
  });

  it("misses cache when a key dimension changes", async () => {
    const nativeMeasure = vi.fn(
      (payload: { width: number }) => payload.width / 10,
    );
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 128, roundToPixel: false });
    clearCache();

    const a = measureHeight("hello", { fontSize: 16 }, 200);
    const b = measureHeight("hello", { fontSize: 16 }, 220);

    expect(a).toBe(20);
    expect(b).toBe(22);
    expect(nativeMeasure).toHaveBeenCalledTimes(2);
  });

  it("clearCache forces re-measure", async () => {
    const nativeMeasure = vi.fn(() => 55);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 128, roundToPixel: false });

    measureHeight("hello", { fontSize: 16 }, 200);
    clearCache();
    measureHeight("hello", { fontSize: 16 }, 200);

    expect(nativeMeasure).toHaveBeenCalledTimes(2);
  });

  it("invalidates cache when fontScale changes", async () => {
    const nativeMeasure = vi.fn(() => 60);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();
    const reactNativeMock = await loadReactNativeMock();

    configureMeasure({ cacheSize: 128, roundToPixel: false });
    clearCache();

    reactNativeMock.__setFontScale(1);
    measureHeight("hello", { fontSize: 16 }, 200);
    measureHeight("hello", { fontSize: 16 }, 200);

    reactNativeMock.__setFontScale(1.2);
    reactNativeMock.__emitDimensionsChange(1.2);
    measureHeight("hello", { fontSize: 16 }, 200);

    expect(nativeMeasure).toHaveBeenCalledTimes(2);
  });

  it("does not reuse approximate cache after native becomes available", async () => {
    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 128, roundToPixel: false });
    clearCache();

    const approximate = measureHeight("hello", { fontSize: 16 }, 200);

    const nativeMeasure = vi.fn(() => 42);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const fromNativeFirst = measureHeight("hello", { fontSize: 16 }, 200);
    const fromNativeCached = measureHeight("hello", { fontSize: 16 }, 200);

    expect(approximate).not.toBe(42);
    expect(fromNativeFirst).toBe(42);
    expect(fromNativeCached).toBe(42);
    expect(nativeMeasure).toHaveBeenCalledTimes(1);
  });
});
