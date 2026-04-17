package com.pretextrn;

import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Build;
import android.text.Layout;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.StaticLayout;
import android.text.TextDirectionHeuristics;
import android.text.TextPaint;
import android.text.TextUtils;
import android.text.style.LineHeightSpan;

import com.facebook.react.uimanager.PixelUtil;

public final class PretextTextMeasure {
  private PretextTextMeasure() {}

  public static double measureHeight(
      String text,
      double width,
      String fontFamily,
      double fontSize,
      String fontWeight,
      String fontStyle,
      double lineHeight,
      double letterSpacing,
      boolean hasLineHeight,
      boolean hasLetterSpacing,
      boolean includeFontPadding,
      int maxLines
  ) {
    String safeText = text == null ? "" : text;
    String layoutText = safeText.isEmpty() ? "\u200B" : safeText;

    // React Native Text with explicit lineHeight renders an empty string as one visual line.
    if (safeText.isEmpty() && hasLineHeight) {
      return Math.max(0.0, lineHeight);
    }

    TextPaint paint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    paint.setTextSize(PixelUtil.toPixelFromDIP((float) fontSize));

    Typeface typeface = resolveTypeface(fontFamily, fontWeight, fontStyle);
    paint.setTypeface(typeface);

    if (hasLetterSpacing && fontSize > 0) {
      paint.setLetterSpacing((float) (letterSpacing / fontSize));
    }

    CharSequence textForLayout = layoutText;
    if (hasLineHeight) {
      float lineHeightPx = PixelUtil.toPixelFromDIP((float) lineHeight);
      int targetLineHeightPx = Math.max(1, (int) Math.ceil(lineHeightPx));
      SpannableString spannableText = new SpannableString(layoutText);
      spannableText.setSpan(
          new ExactLineHeightSpan(targetLineHeightPx),
          0,
          spannableText.length(),
          Spanned.SPAN_INCLUSIVE_INCLUSIVE
      );
      textForLayout = spannableText;
    }

    int widthPx = Math.max(1, Math.round(PixelUtil.toPixelFromDIP((float) width)));
    StaticLayout layout = buildStaticLayout(
        textForLayout,
        paint,
        widthPx,
        includeFontPadding,
      maxLines
    );

    int measuredHeightPx = layout.getHeight();
    if (maxLines > 0 && layout.getLineCount() > 0) {
      int cappedLines = Math.min(maxLines, layout.getLineCount());
      measuredHeightPx = layout.getLineBottom(cappedLines - 1);
    }

    return PixelUtil.toDIPFromPixel(measuredHeightPx);
  }

  private static StaticLayout buildStaticLayout(
      CharSequence text,
      TextPaint paint,
      int widthPx,
      boolean includeFontPadding,
      int maxLines
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      StaticLayout.Builder builder = StaticLayout.Builder.obtain(text, 0, text.length(), paint, widthPx)
          .setAlignment(Layout.Alignment.ALIGN_NORMAL)
          .setIncludePad(includeFontPadding)
          .setTextDirection(TextDirectionHeuristics.FIRSTSTRONG_LTR)
          .setBreakStrategy(Layout.BREAK_STRATEGY_HIGH_QUALITY)
          .setHyphenationFrequency(Layout.HYPHENATION_FREQUENCY_NORMAL);

      if (maxLines > 0) {
        builder.setMaxLines(maxLines);
        builder.setEllipsize(TextUtils.TruncateAt.END);
      }

      return builder.build();
    }

    return new StaticLayout(text, paint, widthPx, Layout.Alignment.ALIGN_NORMAL, 1.0f, 0.0f, includeFontPadding);
  }

  private static final class ExactLineHeightSpan implements LineHeightSpan.WithDensity {
    private final int targetLineHeightPx;

    private ExactLineHeightSpan(int targetLineHeightPx) {
      this.targetLineHeightPx = targetLineHeightPx;
    }

    @Override
    public void chooseHeight(
        CharSequence text,
        int start,
        int end,
        int spanstartv,
        int v,
        Paint.FontMetricsInt fm
    ) {
      chooseHeight(text, start, end, spanstartv, v, fm, null);
    }

    @Override
    public void chooseHeight(
        CharSequence text,
        int start,
        int end,
        int spanstartv,
        int v,
        Paint.FontMetricsInt fm,
        TextPaint paint
    ) {
      if (fm == null) {
        return;
      }

      // Match React Native CustomLineHeightSpan: distribute leading across ascent/descent.
      int leading = targetLineHeightPx - ((-fm.ascent) + fm.descent);
      fm.ascent -= (int) Math.ceil(leading / 2.0f);
      fm.descent += (int) Math.floor(leading / 2.0f);

      // Match first/last line bounds behavior used by RN for paragraph extent.
      if (start == 0) {
        fm.top = fm.ascent;
      }
      if (end == text.length()) {
        fm.bottom = fm.descent;
      }
    }
  }

  private static Typeface resolveTypeface(String fontFamily, String fontWeight, String fontStyle) {
    int style = Typeface.NORMAL;

    if ("italic".equals(fontStyle)) {
      style |= Typeface.ITALIC;
    }

    if ("bold".equals(fontWeight) || "700".equals(fontWeight) || "800".equals(fontWeight) || "900".equals(fontWeight)) {
      style |= Typeface.BOLD;
    }

    if (fontFamily != null && !fontFamily.isEmpty()) {
      Typeface familyTypeface = Typeface.create(fontFamily, style);
      if (familyTypeface != null) {
        return familyTypeface;
      }
    }

    return Typeface.create(Typeface.DEFAULT, style);
  }
}
