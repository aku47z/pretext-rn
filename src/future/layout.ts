import type { PreparedParagraph } from "./prepare";

export interface LayoutOptions {
  width: number;
}

export interface LayoutResult {
  height: number;
  lines: number;
}

export function layout(
  _prepared: PreparedParagraph,
  _options: LayoutOptions,
): LayoutResult {
  throw new Error(
    "layout() is reserved for Phase 3 and is not implemented yet.",
  );
}
