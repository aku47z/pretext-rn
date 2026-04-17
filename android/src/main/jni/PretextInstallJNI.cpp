#include <jni.h>

#include <jsi/jsi.h>

#include "PretextInstall.h"

extern "C" JNIEXPORT void JNICALL
Java_com_pretextrn_PretextMeasureModule_nativeInstallJSI(
    JNIEnv *env,
    jclass,
    jlong runtimePointer) {
  (void)env;

  if (runtimePointer == 0) {
    return;
  }

  auto *runtime = reinterpret_cast<facebook::jsi::Runtime *>(runtimePointer);
  pretext::install(*runtime);
}
