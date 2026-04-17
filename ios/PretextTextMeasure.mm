#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#include <algorithm>
#include <cmath>
#include <optional>
#include <string>

#include "../cpp/PretextPlatformMeasure.h"
#include "../cpp/PretextTypes.h"

namespace pretext {
namespace {

UIFontWeight mapFontWeight(const std::optional<std::string> &fontWeight) {
  if (!fontWeight.has_value()) {
    return UIFontWeightRegular;
  }

  const std::string value = fontWeight.value();
  if (value == "100") return UIFontWeightUltraLight;
  if (value == "200") return UIFontWeightThin;
  if (value == "300") return UIFontWeightLight;
  if (value == "400" || value == "normal") return UIFontWeightRegular;
  if (value == "500") return UIFontWeightMedium;
  if (value == "600") return UIFontWeightSemibold;
  if (value == "700" || value == "bold") return UIFontWeightBold;
  if (value == "800") return UIFontWeightHeavy;
  if (value == "900") return UIFontWeightBlack;
  return UIFontWeightRegular;
}

UIFont *resolveFont(const TextStyle &style) {
  UIFont *font = nil;

  if (style.fontFamily.has_value()) {
    NSString *fontFamily = [NSString stringWithUTF8String:style.fontFamily->c_str()];
    font = [UIFont fontWithName:fontFamily size:style.fontSize];
  }

  if (font == nil) {
    UIFontWeight weight = mapFontWeight(style.fontWeight);
    font = [UIFont systemFontOfSize:style.fontSize weight:weight];
  }

  if (style.fontStyle.has_value() && style.fontStyle.value() == "italic") {
    UIFontDescriptor *descriptor = [font.fontDescriptor fontDescriptorWithSymbolicTraits:UIFontDescriptorTraitItalic];
    UIFont *italic = [UIFont fontWithDescriptor:descriptor size:style.fontSize];
    if (italic != nil) {
      font = italic;
    }
  }

  return font;
}

NSMutableAttributedString *buildAttributedString(const std::string &text, const TextStyle &style) {
  NSString *nsText = [NSString stringWithUTF8String:text.c_str() ?: ""];
  UIFont *font = resolveFont(style);

  NSMutableDictionary<NSAttributedStringKey, id> *attributes = [NSMutableDictionary new];
  attributes[NSFontAttributeName] = font;

  if (style.letterSpacing.has_value()) {
    attributes[NSKernAttributeName] = @(style.letterSpacing.value());
  }

  NSMutableParagraphStyle *paragraphStyle = [NSMutableParagraphStyle new];
  paragraphStyle.lineBreakMode = NSLineBreakByWordWrapping;

  if (style.lineHeight.has_value()) {
    const CGFloat lineHeight = static_cast<CGFloat>(style.lineHeight.value());
    paragraphStyle.minimumLineHeight = lineHeight;
    paragraphStyle.maximumLineHeight = lineHeight;
  }

  attributes[NSParagraphStyleAttributeName] = paragraphStyle;

  return [[NSMutableAttributedString alloc] initWithString:nsText attributes:attributes];
}

} // namespace

double measureHeightPlatform(
    const std::string &text,
    const TextStyle &style,
    double width,
    const std::optional<int> &maxLines) {
  @autoreleasepool {
    if (text.empty() && style.lineHeight.has_value()) {
      return style.lineHeight.value();
    }

    const CGFloat constrainedWidth = static_cast<CGFloat>(std::max(width, 1.0));
    NSMutableAttributedString *attributedText = buildAttributedString(text, style);

    NSTextStorage *textStorage = [[NSTextStorage alloc] initWithAttributedString:attributedText];
    NSLayoutManager *layoutManager = [NSLayoutManager new];
    [textStorage addLayoutManager:layoutManager];

    NSTextContainer *textContainer = [[NSTextContainer alloc] initWithSize:CGSizeMake(constrainedWidth, CGFLOAT_MAX)];
    textContainer.lineFragmentPadding = 0;
    textContainer.maximumNumberOfLines = maxLines.value_or(0);
    textContainer.lineBreakMode = maxLines.has_value() ? NSLineBreakByTruncatingTail : NSLineBreakByWordWrapping;
    [layoutManager addTextContainer:textContainer];

    [layoutManager ensureLayoutForTextContainer:textContainer];
    CGRect usedRect = [layoutManager usedRectForTextContainer:textContainer];
    CGFloat screenScale = [UIScreen mainScreen].scale;
    if (screenScale <= 0) {
      screenScale = 1.0;
    }

    CGFloat rawHeight = CGRectGetHeight(usedRect);

    if (maxLines.has_value()) {
      __block NSInteger lineCount = 0;
      __block CGFloat maxYForLimitedLines = 0;

      NSRange glyphRange = [layoutManager glyphRangeForTextContainer:textContainer];
      [layoutManager enumerateLineFragmentsForGlyphRange:glyphRange
                                              usingBlock:^(
                                                  CGRect,
                                                  CGRect usedLineRect,
                                                  NSTextContainer *,
                                                  NSRange,
                                                  BOOL *stop) {
        lineCount += 1;
        maxYForLimitedLines = CGRectGetMaxY(usedLineRect);

        if (lineCount >= static_cast<NSInteger>(maxLines.value())) {
          *stop = YES;
        }
      }];

      if (lineCount > 0) {
        rawHeight = std::min(rawHeight, maxYForLimitedLines);
      }

      UIFont *font = resolveFont(style);
      const CGFloat effectiveLineHeight = style.lineHeight.has_value()
          ? static_cast<CGFloat>(style.lineHeight.value())
          : font.lineHeight;
      const CGFloat deterministicMaxHeight =
          effectiveLineHeight * static_cast<CGFloat>(maxLines.value());
      rawHeight = std::min(rawHeight, deterministicMaxHeight);
    }

    const CGFloat snappedHeight = std::ceil(rawHeight * screenScale) / screenScale;
    return static_cast<double>(snappedHeight);
  }
}

} // namespace pretext
