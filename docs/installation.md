# Installation and Integration Plan

## 1. Install JS package

Add this package to your React Native app and install pods on iOS.

## 2. iOS integration (Old Architecture)

- Ensure the podspec is linked.
- The module `PretextMeasure` installs JSI from `setBridge:` when runtime is available.
- The installed function is `__pretextMeasureHeight` in JS runtime global scope.

## 3. Android integration (Old Architecture)

- Register `PretextMeasurePackage` in `MainApplication`.
- `PretextMeasureModule.initialize()` obtains the JS runtime pointer and calls `nativeInstallJSI`.
- Native library `pretextmeasure` installs `__pretextMeasureHeight`.

## 4. Fallback behavior

- Default policy: throw if JSI function is unavailable.
- Optional policy: `configureMeasure({ fallbackPolicy: "approximate" })`.

## 5. Verification checklist

- Call `measureHeight` after app startup and verify non-zero values.
- Compare measured values against rendered `Text` blocks for representative typography.
- Validate behavior after accessibility font-scale changes (cache invalidation is implemented).
