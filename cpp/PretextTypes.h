#pragma once

#include <optional>
#include <string>

namespace pretext {

struct TextStyle {
  std::optional<std::string> fontFamily;
  double fontSize = 14.0;
  std::optional<std::string> fontWeight;
  std::optional<std::string> fontStyle;
  std::optional<double> lineHeight;
  std::optional<double> letterSpacing;
  std::optional<bool> includeFontPadding;
};

} // namespace pretext
