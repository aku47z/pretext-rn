import type { MeasureInput } from "../types";

export function fallbackMeasureHeight(input: MeasureInput): number {
  const fontSize = input.style.fontSize;
  const width = Math.max(1, input.width);

  // Heuristic: approximate average Latin glyph width as half the font size.
  const avgGlyphWidth = fontSize * 0.5;
  const charsPerLine = Math.max(1, Math.floor(width / avgGlyphWidth));
  const textLength = input.text.length;
  const estimatedLines = Math.max(1, Math.ceil(textLength / charsPerLine));
  const normalizedMaxLines =
    typeof input.maxLines === "number" && Number.isFinite(input.maxLines)
      ? Math.max(1, Math.floor(input.maxLines))
      : null;
  const finalLineCount =
    normalizedMaxLines == null
      ? estimatedLines
      : Math.min(estimatedLines, normalizedMaxLines);

  // Heuristic fallback when explicit lineHeight is absent.
  const lineHeight = input.style.lineHeight ?? fontSize * 1.2;
  return finalLineCount * lineHeight;
}
