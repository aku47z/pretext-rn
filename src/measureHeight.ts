import {
  clearMeasurementCache,
  ensureFontScaleInvalidationSubscribed,
  getCache,
  getFontScale,
  makeCacheKey,
  resetDefaultCache,
  setCache,
  teardownFontScaleInvalidationSubscription,
} from "./cache/measurementCache";
import { fallbackMeasureHeight } from "./runtime/fallback";
import {
  hasNativeMeasureFunction,
  resolveSynchronousMeasureFunction,
} from "./runtime/jsiRuntime";
import type { MeasureConfig, MeasureInput, MeasureTextStyle } from "./types";

type RuntimeConfig = {
  fallbackPolicy: "throw" | "approximate";
  roundToPixel: boolean;
  diagnostic: boolean;
};

const DEFAULT_CONFIG: RuntimeConfig = {
  fallbackPolicy: "throw",
  roundToPixel: true,
  diagnostic: false,
};

let currentConfig: RuntimeConfig = { ...DEFAULT_CONFIG };

function normalizeInput(
  text: string,
  style: MeasureTextStyle,
  width: number,
  maxLines?: number,
): MeasureInput {
  if (!Number.isFinite(width)) {
    throw new Error("measureHeight width must be a finite number.");
  }

  if (!Number.isFinite(style.fontSize) || style.fontSize <= 0) {
    throw new Error(
      "measureHeight style.fontSize must be a positive finite number.",
    );
  }

  const normalizedWidth = width <= 0 ? 1 : width;

  return {
    text,
    width: normalizedWidth,
    style,
    maxLines,
  };
}

function roundHeight(height: number): number {
  if (!currentConfig.roundToPixel) {
    return height;
  }

  let ratio =
    typeof globalThis.devicePixelRatio === "number"
      ? globalThis.devicePixelRatio
      : NaN;

  if (!Number.isFinite(ratio) || ratio <= 0) {
    try {
      const reactNative = require("react-native") as {
        PixelRatio?: { get?: () => number };
      };
      const runtimeRatio = reactNative.PixelRatio?.get?.();
      if (
        typeof runtimeRatio === "number" &&
        Number.isFinite(runtimeRatio) &&
        runtimeRatio > 0
      ) {
        ratio = runtimeRatio;
      }
    } catch {
      // No-op outside a React Native runtime.
    }
  }

  if (!Number.isFinite(ratio) || ratio <= 0) {
    ratio = 1;
  }

  return Math.round(height * ratio) / ratio;
}

export function configureMeasure(config: MeasureConfig): void {
  if (config.cache) {
    setCache(config.cache);
  } else if (config.cacheSize != null) {
    resetDefaultCache(config.cacheSize);
  }

  currentConfig = {
    fallbackPolicy: config.fallbackPolicy ?? DEFAULT_CONFIG.fallbackPolicy,
    roundToPixel: config.roundToPixel ?? DEFAULT_CONFIG.roundToPixel,
    diagnostic: config.diagnostic ?? DEFAULT_CONFIG.diagnostic,
  };
}

export function isNativeMeasureAvailable(): boolean {
  return hasNativeMeasureFunction();
}

export function clearCache(): void {
  clearMeasurementCache();
}

export function teardownMeasure(): void {
  teardownFontScaleInvalidationSubscription();
}

export function measureHeight(
  text: string,
  style: MeasureTextStyle,
  width: number,
): number {
  return measureHeightInput({ text, style, width });
}

export function measureHeightInput(input: MeasureInput): number {
  ensureFontScaleInvalidationSubscribed();

  const normalized = normalizeInput(
    input.text,
    input.style,
    input.width,
    input.maxLines,
  );

  const fontScale = getFontScale();
  const cache = getCache();
  const cacheKey = makeCacheKey(normalized, fontScale);

  const { measure, strategy } = resolveSynchronousMeasureFunction();
  const shouldCache = strategy !== "approximate";

  if (currentConfig.diagnostic) {
    console.info(
      `[pretext-rn diagnostic] strategy=${strategy} width=${normalized.width}`,
    );
  }

  if (shouldCache) {
    const cachedValue = cache.get(cacheKey);
    if (cachedValue != null) {
      return cachedValue;
    }
  }

  let measured: number;

  try {
    measured = roundHeight(measure(normalized));
  } catch (error) {
    if (currentConfig.fallbackPolicy === "approximate") {
      measured = roundHeight(fallbackMeasureHeight(normalized));
    } else {
      throw error;
    }
  }

  if (shouldCache) {
    cache.set(cacheKey, measured);
  }
  return measured;
}

export function measureHeights(
  inputs: readonly MeasureInput[],
): readonly number[] {
  return inputs.map(measureHeightInput);
}
