#import <Foundation/Foundation.h>

#include <jsi/jsi.h>

#include "../cpp/PretextInstall.h"

namespace pretext {

void installFromRuntimePointer(void *runtimePointer) {
  if (runtimePointer == nullptr) {
    return;
  }

  auto *runtime = reinterpret_cast<facebook::jsi::Runtime *>(runtimePointer);
  pretext::install(*runtime);
}

} // namespace pretext
