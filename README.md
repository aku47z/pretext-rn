# pretext-rn

Synchronous text height measurement for React Native via JSI. Inspired by Cheng Lou's pretext.

## What is this

`pretext-rn` gives you a synchronous `measureHeight` API so you can calculate text height in JavaScript before render-dependent layout decisions. It is designed for cases like virtualized lists, custom layout systems, and predictive sizing where waiting for `onLayout` is too late or too expensive.

## Install

```bash
npm install pretext-rn
# or
yarn add pretext-rn
```

For iOS, install pods after dependency install:

```bash
cd ios && pod install
```

This package autolinks like a standard React Native native module.

## Usage

```ts
import { configureMeasure, measureHeight } from "pretext-rn";

configureMeasure({
  fallbackPolicy: "throw",
  roundToPixel: true,
});

const height = measureHeight(
  "Hello world",
  {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  240,
);

console.log(height);
```

## API

### Functions

- `measureHeight(text: string, style: MeasureTextStyle, width: number): number`
  - Synchronously measures text height.
  - Width values `<= 0` are normalized to `1`.

- `measureHeightInput(input: MeasureInput): number`
  - Same as `measureHeight`, with optional `maxLines`.

- `measureHeights(inputs: readonly MeasureInput[]): readonly number[]`
  - Batch measurement helper.

- `configureMeasure(config: MeasureConfig): void`
  - Sets runtime behavior:
    - `fallbackPolicy: 'throw' | 'approximate'`
    - `roundToPixel: boolean`
    - `cacheSize: number`
    - `cache: CacheAdapter<string, number>`
    - `diagnostic: boolean`

- `clearCache(): void`
  - Clears the internal measurement cache.

- `teardownMeasure(): void`
  - Removes internal font-scale subscription used for cache invalidation.

- `isNativeMeasureAvailable(): boolean`
  - Returns whether the native JSI measurement function is currently available.

- `prepare(text, style, options): PreparedParagraph`
- `layout(prepared, options): LayoutResult`
  - Reserved APIs that currently throw `not implemented` errors.

### Types

- `MeasureTextStyle`
  - `fontFamily?: string`
  - `fontSize: number`
  - `fontWeight?: 'normal' | 'bold' | '100' ... '900'`
  - `fontStyle?: 'normal' | 'italic'`
  - `lineHeight?: number`
  - `letterSpacing?: number`
  - `includeFontPadding?: boolean`

- `MeasureInput`
  - `text: string`
  - `width: number`
  - `style: MeasureTextStyle`
  - `maxLines?: number`

- `MeasureConfig`
- `CacheAdapter<K, V>`
- `PrepareOptions`
- `PreparedParagraph`
- `LayoutOptions`
- `LayoutResult`

## Requirements

- React Native: `>= 0.71.0` (peer dependency)
- Android: `minSdkVersion 21` (library config)
- iOS: `13.0+` (podspec)
- Architecture support:
  - Old Architecture: supported and currently the primary verified native path
  - New Architecture: scaffolded but native JSI activation is not yet complete

## Limitations

- Height measurement only (no width/baseline API yet).
- New Architecture path is not yet production-ready for native measurement.
- No Web implementation.
- No support for inline image measurement in text runs.
- `prepare` / `layout` exports are placeholders and currently throw.

## How it works

On supported native runtimes, the library registers a global JSI host function (`globalThis.__pretextMeasureHeight`) and calls it synchronously from JavaScript. Android uses `TextPaint` + `StaticLayout`, and iOS uses TextKit (`NSLayoutManager` / `NSTextContainer`) to compute height.

The JS layer normalizes inputs, applies optional pixel rounding, and uses an LRU cache keyed by text, width, style fields, `maxLines`, and current font scale. Cache invalidation subscribes to font-scale related dimension changes so accessibility-size changes do not serve stale measurements.

If native measurement is unavailable, behavior is controlled by `fallbackPolicy`: throw immediately, or use an approximate JS heuristic.

## Contributing

### Local checks

```bash
npm test
npm run typecheck
```

### Run parity checks

```bash
npm run android:legacy:parity
npm run ios:legacy:parity
```

### Add a parity case

1. Add a new case entry in `example/HostAppLegacy/App.tsx` (the `buildSweepCases` list).
2. Add/update thresholds and case IDs in:
   - `example/HostAppLegacy/scripts/assert-android-parity.mjs`
   - `example/HostAppLegacy/scripts/assert-ios-parity.mjs`
3. Re-run parity commands and keep strict-mode expectations explicit.

## License

MIT. See [LICENSE](./LICENSE).
