package com.hostapplegacy

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class PretextParityStoreModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PretextParityStore"

  @ReactMethod
  fun writeParityRows(rowsJson: String, promise: Promise) {
    try {
      val file = parityFile()
      file.writeText(rowsJson, Charsets.UTF_8)
      promise.resolve(file.absolutePath)
    } catch (error: Exception) {
      promise.reject("E_PRETEXT_PARITY_WRITE", error)
    }
  }

  @ReactMethod
  fun getParityRowsFilePath(promise: Promise) {
    try {
      promise.resolve(parityFile().absolutePath)
    } catch (error: Exception) {
      promise.reject("E_PRETEXT_PARITY_PATH", error)
    }
  }

  private fun parityFile(): File {
    return File(reactApplicationContext.filesDir, "pretext_parity_rows.json")
  }
}
