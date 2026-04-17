import { describe, expect, it } from "vitest";

import { makeCacheKey } from "../src/cache/measurementCache";
import type { MeasureInput } from "../src/types";

function baseInput(): MeasureInput {
  return {
    text: "hello",
    width: 240,
    style: {
      fontSize: 16,
      fontFamily: "Inter",
      fontWeight: "400",
      fontStyle: "normal",
      lineHeight: 20,
      letterSpacing: 0,
      includeFontPadding: true,
    },
    maxLines: 2,
  };
}

describe("cache key generation", () => {
  it("produces the same key for identical inputs", () => {
    const input = baseInput();

    const keyA = makeCacheKey(input, 1);
    const keyB = makeCacheKey(input, 1);

    expect(keyA).toBe(keyB);
  });

  it("changes key when text changes", () => {
    const a = baseInput();
    const b = { ...baseInput(), text: "hello!" };

    expect(makeCacheKey(a, 1)).not.toBe(makeCacheKey(b, 1));
  });

  it("changes key when width changes", () => {
    const a = baseInput();
    const b = { ...baseInput(), width: 241 };

    expect(makeCacheKey(a, 1)).not.toBe(makeCacheKey(b, 1));
  });

  it("changes key when font scale changes", () => {
    const input = baseInput();

    expect(makeCacheKey(input, 1)).not.toBe(makeCacheKey(input, 1.2));
  });

  it("changes key when maxLines changes", () => {
    const a = baseInput();
    const b = { ...baseInput(), maxLines: 3 };

    expect(makeCacheKey(a, 1)).not.toBe(makeCacheKey(b, 1));
  });

  it("changes key when lineHeight changes", () => {
    const a = baseInput();
    const b = {
      ...baseInput(),
      style: { ...baseInput().style, lineHeight: 22 },
    };

    expect(makeCacheKey(a, 1)).not.toBe(makeCacheKey(b, 1));
  });

  it("changes key when letterSpacing changes", () => {
    const a = baseInput();
    const b = {
      ...baseInput(),
      style: { ...baseInput().style, letterSpacing: 0.25 },
    };

    expect(makeCacheKey(a, 1)).not.toBe(makeCacheKey(b, 1));
  });

  it("changes key when fontStyle changes", () => {
    const a = baseInput();
    const b = {
      ...baseInput(),
      style: { ...baseInput().style, fontStyle: "italic" },
    };

    expect(makeCacheKey(a, 1)).not.toBe(makeCacheKey(b, 1));
  });

  it("changes key when includeFontPadding changes", () => {
    const a = baseInput();
    const b = {
      ...baseInput(),
      style: { ...baseInput().style, includeFontPadding: false },
    };

    expect(makeCacheKey(a, 1)).not.toBe(makeCacheKey(b, 1));
  });

  it("rounds width and font scale to 3 decimals in key", () => {
    const input = baseInput();

    const keyA = makeCacheKey({ ...input, width: 100.1234 }, 1.2344);
    const keyB = makeCacheKey({ ...input, width: 100.12349 }, 1.23449);

    expect(keyA).toBe(keyB);
  });
});
