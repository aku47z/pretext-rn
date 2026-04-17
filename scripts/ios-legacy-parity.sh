#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_APP_DIR="$ROOT_DIR/example/HostAppLegacy"
PACKAGE_TGZ="$ROOT_DIR/pretext-rn-0.1.0-alpha.tgz"
IOS_RUN_LOG="/tmp/pretext-ios-run.log"

pushd "$ROOT_DIR" >/dev/null
npm pack >/tmp/pretext-pack.log
popd >/dev/null

pushd "$HOST_APP_DIR" >/dev/null
npm i "$PACKAGE_TGZ" >/tmp/pretext-install.log

if [[ -n "${IOS_SIMULATOR:-}" ]]; then
  npx react-native run-ios --simulator "$IOS_SIMULATOR" >"$IOS_RUN_LOG" 2>&1
else
  npx react-native run-ios >"$IOS_RUN_LOG" 2>&1
fi

PRETEXT_PARITY_LOG_FILE="$IOS_RUN_LOG" npm run -s ios:parity:assert || npm run -s ios:parity:assert
popd >/dev/null

echo "iOS legacy parity workflow complete."
echo "- Pack log: /tmp/pretext-pack.log"
echo "- Install log: /tmp/pretext-install.log"
echo "- Run log: $IOS_RUN_LOG"
