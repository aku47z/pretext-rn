#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_APP_DIR="$ROOT_DIR/example/HostAppLegacy"
PACKAGE_TGZ="$ROOT_DIR/pretext-rn-0.1.0-alpha.tgz"

pushd "$ROOT_DIR" >/dev/null
npm pack >/tmp/pretext-pack.log
popd >/dev/null

pushd "$HOST_APP_DIR" >/dev/null
npm i "$PACKAGE_TGZ" >/tmp/pretext-install.log

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  if ! adb -s "$ANDROID_SERIAL" get-state >/dev/null 2>&1; then
    echo "Android device '$ANDROID_SERIAL' is not available. Connect it and retry." >&2
    exit 1
  fi
else
  if ! adb get-state >/dev/null 2>&1; then
    echo "No Android device or emulator connected. Start one or set ANDROID_SERIAL." >&2
    exit 1
  fi
fi

# Reset log buffer so parity assertion scans only fresh app output.
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  adb -s "$ANDROID_SERIAL" logcat -c >/tmp/pretext-logcat-clear.log 2>&1 || true
else
  adb logcat -c >/tmp/pretext-logcat-clear.log 2>&1 || true
fi

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  npx react-native run-android --device "$ANDROID_SERIAL" >/tmp/pretext-run.log
else
  npx react-native run-android >/tmp/pretext-run.log
fi

npm run -s android:parity:assert
popd >/dev/null

echo "Android legacy parity workflow complete."
echo "- Pack log: /tmp/pretext-pack.log"
echo "- Install log: /tmp/pretext-install.log"
echo "- Run log: /tmp/pretext-run.log"
