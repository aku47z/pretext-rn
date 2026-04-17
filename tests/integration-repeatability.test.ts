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

describe("repeatability integration checks (mocked runtime)", () => {
  beforeEach(async () => {
    const reactNativeMock = await loadReactNativeMock();
    reactNativeMock.__resetReactNativeMock();
    delete (globalThis as Record<string, unknown>).__pretextMeasureHeight;
    delete (globalThis as Record<string, unknown>).devicePixelRatio;
    vi.restoreAllMocks();
  });

  it("returns identical results across 100 identical calls", async () => {
    const nativeMeasure = vi.fn(() => 37.25);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { configureMeasure, clearCache, measureHeight } =
      await loadMeasureModule();
    configureMeasure({ cacheSize: 128, roundToPixel: false });
    clearCache();

    const results = Array.from({ length: 100 }, () =>
      measureHeight("repeat me", { fontSize: 16, fontWeight: "400" }, 240),
    );

    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe(37.25);
    expect(nativeMeasure).toHaveBeenCalledTimes(1);
  });

  it("returns identical result before and after clearCache", async () => {
    const nativeMeasure = vi.fn(() => 19);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { configureMeasure, clearCache, measureHeight } =
      await loadMeasureModule();
    configureMeasure({ cacheSize: 128, roundToPixel: false });
    clearCache();

    const first = measureHeight("stable", { fontSize: 15 }, 200);
    const second = measureHeight("stable", { fontSize: 15 }, 200);
    clearCache();
    const third = measureHeight("stable", { fontSize: 15 }, 200);

    expect(first).toBe(19);
    expect(second).toBe(19);
    expect(third).toBe(19);
    expect(nativeMeasure).toHaveBeenCalledTimes(2);
  });
});
