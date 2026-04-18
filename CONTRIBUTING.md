# Contributing

Thanks for contributing to pretext-rn.

## Setup

1. Install root dependencies:

```bash
npm ci
```

2. Install HostAppLegacy dependencies:

```bash
npm ci --prefix example/HostAppLegacy
```

## Run the Example App

### Android

```bash
cd example/HostAppLegacy
npm run android
```

### iOS

```bash
cd example/HostAppLegacy
npm run ios
```

## Run Tests

From the repository root:

```bash
npm test
npm run typecheck
```

## Run Parity Tests

From the repository root:

```bash
npm run android:legacy:parity
npm run ios:legacy:parity
```

## Add a New Parity Case

1. Add a case in `example/HostAppLegacy/App.tsx` (`buildSweepCases`).
2. Update parity assertions and thresholds in:
   - `example/HostAppLegacy/scripts/assert-android-parity.mjs`
   - `example/HostAppLegacy/scripts/assert-ios-parity.mjs`
3. Re-run parity commands and verify strict-mode behavior.

## Pull Requests

- Keep changes scoped and include tests where possible.
- Update docs when behavior changes (`README.md`, `CHANGELOG.md`, and `TODO.md` as needed).
- Ensure CI checks pass before requesting review.
