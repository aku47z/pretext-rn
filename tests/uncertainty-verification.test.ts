import { beforeEach, describe, expect, it, vi } from "vitest";

type MeasureModule = typeof import("../src/measureHeight");
type ReactNativeMockModule = typeof import("react-native");

const ARABIC_TEXT = "مرحبا بك في تطبيقنا المتطور";
const LTR_TEXT = "welcome to our advanced app";
const EMOJI_TEXT = "🚀🔥✨";

async function loadMeasureModule(): Promise<MeasureModule> {
  vi.resetModules();
  return import("../src/measureHeight");
}

async function loadReactNativeMock(): Promise<ReactNativeMockModule> {
  return import("react-native");
}

describe("uncertainty verification", () => {
  beforeEach(async () => {
    const reactNativeMock = await loadReactNativeMock();
    reactNativeMock.__resetReactNativeMock();
    delete (globalThis as Record<string, unknown>).__pretextMeasureHeight;
    delete (globalThis as Record<string, unknown>).devicePixelRatio;
    vi.restoreAllMocks();
  });

  it("measures RTL/LTR independently and caches Arabic key correctly", async () => {
    const nativeMeasure = vi.fn((payload: { text: string }) => {
      if (payload.text === ARABIC_TEXT) {
        return 36;
      }
      if (payload.text === LTR_TEXT) {
        return 24;
      }
      return 10;
    });

    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 128, roundToPixel: false });
    clearCache();

    const rtlFirst = measureHeight(ARABIC_TEXT, { fontSize: 16 }, 240);
    const rtlSecond = measureHeight(ARABIC_TEXT, { fontSize: 16 }, 240);
    const ltr = measureHeight(LTR_TEXT, { fontSize: 16 }, 240);

    expect(rtlFirst).toBe(36);
    expect(rtlSecond).toBe(36);
    expect(ltr).toBe(24);
    expect(nativeMeasure).toHaveBeenCalledTimes(2);
  });

  it("clamps width 0 and -1 to width 1 without crashing", async () => {
    const nativeMeasure = vi.fn((payload: { width: number }) => payload.width);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 128, roundToPixel: false, diagnostic: true });

    clearCache();
    const fromZero = measureHeight("width-0", { fontSize: 16 }, 0);

    clearCache();
    const fromNegative = measureHeight("width--1", { fontSize: 16 }, -1);

    clearCache();
    const fromOne = measureHeight("width-1", { fontSize: 16 }, 1);

    expect(fromZero).toBe(1);
    expect(fromNegative).toBe(1);
    expect(fromOne).toBe(1);
    expect(nativeMeasure).toHaveBeenCalledTimes(3);
    expect(nativeMeasure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ width: 1 }),
    );
    expect(nativeMeasure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ width: 1 }),
    );
    expect(nativeMeasure).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ width: 1 }),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[pretext-rn diagnostic] strategy=native width=1",
    );
  });

  it("applies pixel rounding for emoji-only text", async () => {
    const nativeMeasure = vi.fn(() => 16.3);
    (globalThis as Record<string, unknown>).__pretextMeasureHeight =
      nativeMeasure;
    (globalThis as Record<string, unknown>).devicePixelRatio = 3;

    const { measureHeight, configureMeasure, clearCache } =
      await loadMeasureModule();

    configureMeasure({ cacheSize: 128, roundToPixel: true });
    clearCache();

    const measured = measureHeight(EMOJI_TEXT, { fontSize: 16 }, 240);

    expect(measured).toBeCloseTo(49 / 3, 10);
    expect(nativeMeasure).toHaveBeenCalledTimes(1);
  });
});
