export type FontWeight =
  | "normal"
  | "bold"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export interface MeasureTextStyle {
  fontFamily?: string;
  fontSize: number;
  fontWeight?: FontWeight;
  fontStyle?: "normal" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
  includeFontPadding?: boolean;
}

export interface MeasureInput {
  text: string;
  width: number;
  style: MeasureTextStyle;
  maxLines?: number;
}

export interface MeasureConfig {
  cache?: CacheAdapter<string, number>;
  cacheSize?: number;
  fallbackPolicy?: "throw" | "approximate";
  roundToPixel?: boolean;
  diagnostic?: boolean;
}

export interface CacheAdapter<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): void;
  clear(): void;
}

export interface NativeMeasurePayload {
  text: string;
  width: number;
  style: MeasureTextStyle;
  maxLines?: number;
}
