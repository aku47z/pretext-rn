import { Dimensions, PixelRatio } from "react-native";

import type { CacheAdapter, MeasureInput, MeasureTextStyle } from "../types";
import { LruCache } from "./lruCache";

const DEFAULT_CACHE_SIZE = 1000;

let cache: CacheAdapter<string, number> = new LruCache<string, number>(
  DEFAULT_CACHE_SIZE,
);
let lastKnownFontScale = getFontScale();
let subscribed = false;
let dimensionsSubscription: { remove?: () => void } | undefined;
let dimensionsListener:
  | ((event: { window: { fontScale?: number } }) => void)
  | undefined;

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function getStyleKey(style: MeasureTextStyle): string {
  return [
    style.fontFamily ?? "",
    round3(style.fontSize),
    style.fontWeight ?? "",
    style.fontStyle ?? "",
    round3(style.lineHeight ?? -1),
    round3(style.letterSpacing ?? -1),
    style.includeFontPadding == null
      ? "u"
      : style.includeFontPadding
        ? "1"
        : "0",
  ].join("|");
}

export function getFontScale(): number {
  try {
    const scale = PixelRatio.getFontScale();
    if (Number.isFinite(scale) && scale > 0) {
      return scale;
    }
  } catch {
    // No-op outside a React Native runtime.
  }

  return 1;
}

export function makeCacheKey(input: MeasureInput, fontScale: number): string {
  return [
    input.text,
    round3(input.width),
    round3(fontScale),
    input.maxLines ?? 0,
    getStyleKey(input.style),
  ].join("::");
}

export function getCache(): CacheAdapter<string, number> {
  return cache;
}

export function setCache(nextCache: CacheAdapter<string, number>): void {
  cache = nextCache;
}

export function resetDefaultCache(size: number = DEFAULT_CACHE_SIZE): void {
  cache = new LruCache<string, number>(size);
}

export function clearMeasurementCache(): void {
  cache.clear();
}

export function ensureFontScaleInvalidationSubscribed(): void {
  if (subscribed) {
    return;
  }

  try {
    dimensionsListener = ({ window }) => {
      const nextScale =
        typeof window.fontScale === "number"
          ? window.fontScale
          : getFontScale();
      if (nextScale !== lastKnownFontScale) {
        lastKnownFontScale = nextScale;
        cache.clear();
      }
    };

    dimensionsSubscription =
      Dimensions.addEventListener("change", dimensionsListener) ?? undefined;
    subscribed = true;
  } catch {
    // No-op outside a React Native runtime.
  }
}

export function teardownFontScaleInvalidationSubscription(): void {
  if (!subscribed) {
    return;
  }

  try {
    dimensionsSubscription?.remove?.();

    const dimensionsWithLegacyRemove = Dimensions as unknown as {
      removeEventListener?: (
        eventName: "change",
        listener: (event: { window: { fontScale?: number } }) => void,
      ) => void;
    };

    if (dimensionsListener && dimensionsWithLegacyRemove.removeEventListener) {
      dimensionsWithLegacyRemove.removeEventListener(
        "change",
        dimensionsListener,
      );
    }
  } catch {
    // No-op outside a React Native runtime.
  }

  dimensionsSubscription = undefined;
  dimensionsListener = undefined;
  subscribed = false;
  lastKnownFontScale = getFontScale();
}
