import { fallbackMeasureHeight } from "./fallback";

import type { NativeMeasurePayload } from "../types";

type NativeMeasureFn = (payload: NativeMeasurePayload) => number;
type MeasureFn = (payload: NativeMeasurePayload) => number;
export type MeasureStrategy = "native" | "bridge" | "approximate";

export type SynchronousMeasureResolution = {
  measure: MeasureFn;
  strategy: MeasureStrategy;
};

const JSI_FUNCTION_NAME = "__pretextMeasureHeight";

interface JsiGlobal {
  [JSI_FUNCTION_NAME]?: NativeMeasureFn;
}

type LegacyInstallModule = {
  installJSI?: () => boolean;
  installJSIAsync?: () => Promise<boolean>;
  measureSync?: (payload: NativeMeasurePayload) => number;
};

let didScheduleInstall = false;

function getLegacyInstallModule(): LegacyInstallModule | null {
  try {
    const reactNative = require("react-native") as {
      NativeModules?: { PretextMeasure?: LegacyInstallModule };
    };
    return reactNative.NativeModules?.PretextMeasure ?? null;
  } catch {
    return null;
  }
}

function getTurboInstallModule(): LegacyInstallModule | null {
  try {
    const reactNative = require("react-native") as {
      TurboModuleRegistry?: {
        get?: <T>(name: string) => T | null;
      };
    };

    const registry = reactNative.TurboModuleRegistry;
    const nativePretext = registry?.get?.<LegacyInstallModule>("NativePretext");
    if (nativePretext) {
      return nativePretext;
    }

    const pretextMeasure =
      registry?.get?.<LegacyInstallModule>("PretextMeasure");
    if (pretextMeasure) {
      return pretextMeasure;
    }

    const nativePretextModule = require("../NativePretext") as {
      default?: LegacyInstallModule | null;
    };
    return nativePretextModule.default ?? null;
  } catch {
    return null;
  }
}

function runInstallAttempt(): void {
  const moduleCandidate = getTurboInstallModule() ?? getLegacyInstallModule();
  if (!moduleCandidate) {
    scheduleInstallAttempt();
    return;
  }

  // If another install path already succeeded, avoid duplicate native installs.
  if (readGlobalMeasureFunction() != null) {
    return;
  }

  try {
    const installed = moduleCandidate.installJSI?.();
    if (installed) {
      return;
    }
  } catch {
    // Ignore and try async install path.
  }

  try {
    const maybePromise = moduleCandidate.installJSIAsync?.();
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.then((installed) => {
        if (!installed && readGlobalMeasureFunction() == null) {
          // Runtime may not be ready yet; retry a few times.
          scheduleInstallAttempt();
        }
      });
      maybePromise.catch(() => {
        // If runtime is still booting, retry a few times.
        scheduleInstallAttempt();
      });
      return;
    }
  } catch {
    // If runtime is still booting, retry a few times.
  }

  scheduleInstallAttempt();
}

function scheduleInstallAttempt(): void {
  if (didScheduleInstall) {
    return;
  }

  didScheduleInstall = true;
  const schedule =
    typeof globalThis.setTimeout === "function"
      ? globalThis.setTimeout.bind(globalThis)
      : null;

  if (!schedule) {
    didScheduleInstall = false;
    runInstallAttempt();
    return;
  }

  schedule(() => {
    didScheduleInstall = false;
    runInstallAttempt();
  }, 0);
}

function readGlobalMeasureFunction(): NativeMeasureFn | null {
  const candidate = (globalThis as JsiGlobal)[JSI_FUNCTION_NAME];
  return typeof candidate === "function" ? candidate : null;
}

function getBridgeMeasureFunction(): NativeMeasureFn | null {
  const moduleCandidate = getTurboInstallModule() ?? getLegacyInstallModule();
  const bridgeMeasure = moduleCandidate?.measureSync;
  if (typeof bridgeMeasure !== "function") {
    return null;
  }

  return (payload: NativeMeasurePayload) => {
    const measured = bridgeMeasure(payload);
    if (!Number.isFinite(measured)) {
      throw new Error("Bridge measureSync returned a non-finite value.");
    }
    return measured;
  };
}

export function getNativeMeasureFunction(options?: {
  attemptInstall?: boolean;
}): NativeMeasureFn | null {
  const immediate = readGlobalMeasureFunction();
  if (immediate) {
    return immediate;
  }

  if (options?.attemptInstall) {
    runInstallAttempt();
  }

  return null;
}

export function getSynchronousMeasureFunction(): MeasureFn {
  const nativeMeasure = getNativeMeasureFunction({ attemptInstall: true });
  if (nativeMeasure) {
    return nativeMeasure;
  }

  const bridgeMeasure = getBridgeMeasureFunction();
  if (bridgeMeasure) {
    return bridgeMeasure;
  }

  return fallbackMeasureHeight;
}

export function resolveSynchronousMeasureFunction(): SynchronousMeasureResolution {
  const nativeMeasure = getNativeMeasureFunction({ attemptInstall: true });
  if (nativeMeasure) {
    return { measure: nativeMeasure, strategy: "native" };
  }

  const bridgeMeasure = getBridgeMeasureFunction();
  if (bridgeMeasure) {
    return { measure: bridgeMeasure, strategy: "bridge" };
  }

  return { measure: fallbackMeasureHeight, strategy: "approximate" };
}

export function hasNativeMeasureFunction(): boolean {
  return getNativeMeasureFunction({ attemptInstall: false }) !== null;
}
