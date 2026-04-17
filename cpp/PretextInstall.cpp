#include "PretextInstall.h"

#include <optional>
#include <stdexcept>
#include <string>

#include <jsi/jsi.h>

#include "PretextPlatformMeasure.h"
#include "PretextTypes.h"

namespace pretext {
namespace {
using facebook::jsi::Function;
using facebook::jsi::HostFunctionType;
using facebook::jsi::Object;
using facebook::jsi::PropNameID;
using facebook::jsi::Runtime;
using facebook::jsi::Scope;
using facebook::jsi::String;
using facebook::jsi::Value;

std::optional<std::string> optionalStringProp(Runtime &runtime, const Object &object, const char *name) {
  if (!object.hasProperty(runtime, name)) {
    return std::nullopt;
  }

  Value value = object.getProperty(runtime, name);
  if (value.isUndefined() || value.isNull()) {
    return std::nullopt;
  }

  if (!value.isString()) {
    throw std::runtime_error(std::string("Expected string for property: ") + name);
  }

  return value.asString(runtime).utf8(runtime);
}

std::optional<double> optionalNumberProp(Runtime &runtime, const Object &object, const char *name) {
  if (!object.hasProperty(runtime, name)) {
    return std::nullopt;
  }

  Value value = object.getProperty(runtime, name);
  if (value.isUndefined() || value.isNull()) {
    return std::nullopt;
  }

  if (!value.isNumber()) {
    throw std::runtime_error(std::string("Expected number for property: ") + name);
  }

  return value.asNumber();
}

std::optional<bool> optionalBoolProp(Runtime &runtime, const Object &object, const char *name) {
  if (!object.hasProperty(runtime, name)) {
    return std::nullopt;
  }

  Value value = object.getProperty(runtime, name);
  if (value.isUndefined() || value.isNull()) {
    return std::nullopt;
  }

  if (!value.isBool()) {
    throw std::runtime_error(std::string("Expected boolean for property: ") + name);
  }

  return value.getBool();
}

TextStyle parseStyle(Runtime &runtime, const Object &styleObject) {
  TextStyle style;
  style.fontFamily = optionalStringProp(runtime, styleObject, "fontFamily");
  style.fontWeight = optionalStringProp(runtime, styleObject, "fontWeight");
  style.fontStyle = optionalStringProp(runtime, styleObject, "fontStyle");
  style.lineHeight = optionalNumberProp(runtime, styleObject, "lineHeight");
  style.letterSpacing = optionalNumberProp(runtime, styleObject, "letterSpacing");
  style.includeFontPadding = optionalBoolProp(runtime, styleObject, "includeFontPadding");

  Value fontSizeValue = styleObject.getProperty(runtime, "fontSize");
  if (!fontSizeValue.isNumber()) {
    throw std::runtime_error("Expected number for style.fontSize");
  }
  style.fontSize = fontSizeValue.asNumber();

  return style;
}

std::optional<int> parseMaxLines(Runtime &runtime, const Object &payloadObject) {
  std::optional<double> maxLines = optionalNumberProp(runtime, payloadObject, "maxLines");
  if (!maxLines.has_value()) {
    return std::nullopt;
  }

  const int converted = static_cast<int>(maxLines.value());
  if (converted <= 0) {
    return std::nullopt;
  }

  return converted;
}

Value measureHeightHostFunction(
    Runtime &runtime,
    const Value &,
    const Value *arguments,
    size_t count) {
  if (count != 1 || !arguments[0].isObject()) {
    throw std::runtime_error("__pretextMeasureHeight expects one payload object argument.");
  }

  Object payload = arguments[0].asObject(runtime);

  Value textValue = payload.getProperty(runtime, "text");
  if (!textValue.isString()) {
    throw std::runtime_error("Expected string for payload.text");
  }
  const std::string text = textValue.asString(runtime).utf8(runtime);

  Value widthValue = payload.getProperty(runtime, "width");
  if (!widthValue.isNumber()) {
    throw std::runtime_error("Expected number for payload.width");
  }
  const double width = widthValue.asNumber();

  Value styleValue = payload.getProperty(runtime, "style");
  if (!styleValue.isObject()) {
    throw std::runtime_error("Expected object for payload.style");
  }
  Object styleObject = styleValue.asObject(runtime);
  const TextStyle style = parseStyle(runtime, styleObject);

  const std::optional<int> maxLines = parseMaxLines(runtime, payload);

  const double height = measureHeightPlatform(text, style, width, maxLines);
  return Value(height);
}

} // namespace

void install(Runtime &runtime) {
  static const char *kFunctionName = "__pretextMeasureHeight";

  Scope scope(runtime);

  const auto fn = Function::createFromHostFunction(
      runtime,
      PropNameID::forAscii(runtime, kFunctionName),
      1,
      static_cast<HostFunctionType>(measureHeightHostFunction));

  runtime.global().setProperty(runtime, kFunctionName, std::move(fn));
}

} // namespace pretext
