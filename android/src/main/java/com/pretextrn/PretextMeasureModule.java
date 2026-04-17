package com.pretextrn;

import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.bridge.queue.MessageQueueThread;

@ReactModule(name = PretextMeasureModule.NAME)
public class PretextMeasureModule extends NativePretextSpec {
  public static final String NAME = "PretextMeasure";

  static {
    System.loadLibrary("pretextmeasure");
  }

  public PretextMeasureModule(ReactApplicationContext reactContext) {
    super(reactContext);
    installJSIEagerly();
  }

  @Override
  public void initialize() {
    super.initialize();
    installJSIEagerly();
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean installJSI() {
    ReactApplicationContext context = getReactApplicationContext();
    MessageQueueThread jsQueueThread =
        context.getCatalystInstance().getReactQueueConfiguration().getJSQueueThread();

    if (jsQueueThread.isOnThread()) {
      return installFromRuntime();
    }
    return false;
  }

  private void installJSIEagerly() {
    ReactApplicationContext context = getReactApplicationContext();
    if (!context.hasActiveCatalystInstance()) {
      return;
    }

    MessageQueueThread jsQueueThread =
        context.getCatalystInstance().getReactQueueConfiguration().getJSQueueThread();

    if (jsQueueThread.isOnThread()) {
      installFromRuntime();
      return;
    }

    jsQueueThread.runOnQueue(() -> {
      try {
        installFromRuntime();
      } catch (Exception ignored) {
        // No-op: initialization can race with runtime readiness during app boot.
      }
    });
  }

  @ReactMethod
  public void installJSIAsync(Promise promise) {
    ReactApplicationContext context = getReactApplicationContext();
    MessageQueueThread jsQueueThread =
        context.getCatalystInstance().getReactQueueConfiguration().getJSQueueThread();

    if (jsQueueThread.isOnThread()) {
      promise.resolve(installFromRuntime());
      return;
    }

    jsQueueThread.runOnQueue(() -> {
      try {
        promise.resolve(installFromRuntime());
      } catch (Exception exception) {
        promise.reject("E_PRETEXT_INSTALL", exception);
      }
    });
  }

  private boolean installFromRuntime() {
    JavaScriptContextHolder jsContext = getReactApplicationContext().getJavaScriptContextHolder();
    long runtimePtr = jsContext.get();
    if (runtimePtr != 0) {
      nativeInstallJSI(runtimePtr);
      return true;
    }

    return false;
  }

  private static native void nativeInstallJSI(long runtimePointer);
}
