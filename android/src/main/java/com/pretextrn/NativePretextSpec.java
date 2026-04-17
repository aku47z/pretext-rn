package com.pretextrn;

import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReactModuleWithSpec;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;

public abstract class NativePretextSpec extends ReactContextBaseJavaModule
    implements ReactModuleWithSpec, TurboModule {
  public static final String NAME = "PretextMeasure";

  public NativePretextSpec(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  @DoNotStrip
  public abstract boolean installJSI();

  @ReactMethod
  @DoNotStrip
  public abstract void installJSIAsync(Promise promise);
}
