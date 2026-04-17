import type { MeasureTextStyle } from "../types";

export interface PreparedParagraph {
  readonly _opaque: "PreparedParagraph";
}

export interface PrepareOptions {
  locale?: string;
}

export function prepare(
  _text: string,
  _style: MeasureTextStyle,
  _options?: PrepareOptions,
): PreparedParagraph {
  throw new Error(
    "prepare() is reserved for Phase 3 and is not implemented yet.",
  );
}
