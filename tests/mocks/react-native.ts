type DimensionsChangeEvent = {
  window: {
    fontScale?: number;
  };
};

type DimensionsListener = (event: DimensionsChangeEvent) => void;

let fontScale = 1;
let dimensionsListener: DimensionsListener | undefined;

export const PixelRatio = {
  getFontScale(): number {
    return fontScale;
  },
};

export const Dimensions = {
  addEventListener(_eventName: string, listener: DimensionsListener) {
    dimensionsListener = listener;
    return {
      remove() {
        if (dimensionsListener === listener) {
          dimensionsListener = undefined;
        }
      },
    };
  },
};

export const NativeModules: Record<string, unknown> = {
  PretextMeasure: {
    installJSI: () => true,
  },
};

export const TurboModuleRegistry = {
  get<T>(_name: string): T | null {
    return null;
  },
};

export function __setFontScale(nextScale: number): void {
  fontScale = nextScale;
}

export function __emitDimensionsChange(nextScale: number): void {
  dimensionsListener?.({ window: { fontScale: nextScale } });
}

export function __resetReactNativeMock(): void {
  fontScale = 1;
  dimensionsListener = undefined;
}
