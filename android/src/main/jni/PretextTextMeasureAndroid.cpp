#include <jni.h>

#include <algorithm>
#include <optional>
#include <stdexcept>
#include <string>

#include "PretextPlatformMeasure.h"
#include "PretextTypes.h"

namespace {
JavaVM *gJvm = nullptr;

JNIEnv *getEnv() {
  if (gJvm == nullptr) {
    return nullptr;
  }

  JNIEnv *env = nullptr;
  const jint status = gJvm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);

  if (status == JNI_OK) {
    return env;
  }

  if (status == JNI_EDETACHED) {
    if (gJvm->AttachCurrentThread(&env, nullptr) != JNI_OK) {
      return nullptr;
    }
    return env;
  }

  return nullptr;
}

jclass findClassGlobal(JNIEnv *env, const char *name) {
  jclass localRef = env->FindClass(name);
  if (localRef == nullptr) {
    return nullptr;
  }

  jclass globalRef = static_cast<jclass>(env->NewGlobalRef(localRef));
  env->DeleteLocalRef(localRef);
  return globalRef;
}

jstring toJStringOrNull(JNIEnv *env, const std::optional<std::string> &value) {
  if (!value.has_value()) {
    return nullptr;
  }

  return env->NewStringUTF(value->c_str());
}
} // namespace

jint JNI_OnLoad(JavaVM *vm, void *) {
  gJvm = vm;
  return JNI_VERSION_1_6;
}

namespace pretext {

double measureHeightPlatform(
    const std::string &text,
    const TextStyle &style,
    double width,
    const std::optional<int> &maxLines) {
  JNIEnv *env = getEnv();
  if (env == nullptr) {
    throw std::runtime_error("Unable to get JNIEnv for text measurement.");
  }

  static jclass measureClass = findClassGlobal(env, "com/pretextrn/PretextTextMeasure");
  if (measureClass == nullptr) {
    throw std::runtime_error("Failed to find com/pretextrn/PretextTextMeasure.");
  }

  static jmethodID measureMethod = env->GetStaticMethodID(
      measureClass,
      "measureHeight",
      "(Ljava/lang/String;DLjava/lang/String;DLjava/lang/String;Ljava/lang/String;DDZZZI)D");

  if (measureMethod == nullptr) {
    throw std::runtime_error("Failed to find PretextTextMeasure.measureHeight method.");
  }

  jstring jText = env->NewStringUTF(text.c_str());
  jstring jFontFamily = toJStringOrNull(env, style.fontFamily);
  jstring jFontWeight = toJStringOrNull(env, style.fontWeight);
  jstring jFontStyle = toJStringOrNull(env, style.fontStyle);

  const double fontSize = style.fontSize;
  const double lineHeight = style.lineHeight.value_or(0.0);
  const double letterSpacing = style.letterSpacing.value_or(0.0);
  const jboolean hasLineHeight = style.lineHeight.has_value();
  const jboolean hasLetterSpacing = style.letterSpacing.has_value();
  const jboolean includeFontPadding = style.includeFontPadding.value_or(true);
  const jint maxLinesInt = maxLines.value_or(0);

  jdouble result = env->CallStaticDoubleMethod(
      measureClass,
      measureMethod,
      jText,
      width,
      jFontFamily,
      fontSize,
      jFontWeight,
      jFontStyle,
      lineHeight,
      letterSpacing,
      hasLineHeight,
      hasLetterSpacing,
      includeFontPadding,
      maxLinesInt);

  env->DeleteLocalRef(jText);
  if (jFontFamily != nullptr) env->DeleteLocalRef(jFontFamily);
  if (jFontWeight != nullptr) env->DeleteLocalRef(jFontWeight);
  if (jFontStyle != nullptr) env->DeleteLocalRef(jFontStyle);

  return static_cast<double>(result);
}

} // namespace pretext
