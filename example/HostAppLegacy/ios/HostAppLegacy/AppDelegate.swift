import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Foundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "HostAppLegacy",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

@objc(PretextParityStore)
class PretextParityStore: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    return "PretextParityStore"
  }

  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(writeParityRows:resolver:rejecter:)
  func writeParityRows(
    _ payload: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      let path = try parityRowsFilePath()
      let dir = URL(fileURLWithPath: path).deletingLastPathComponent()
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      try payload.write(toFile: path, atomically: true, encoding: .utf8)
      resolve(path)
    } catch {
      reject("ERR_PARITY_WRITE", "Failed to persist parity rows", error)
    }
  }

  @objc(getParityRowsFilePath:rejecter:)
  func getParityRowsFilePath(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      resolve(try parityRowsFilePath())
    } catch {
      reject("ERR_PARITY_PATH", "Failed to resolve parity rows path", error)
    }
  }

  private func parityRowsFilePath() throws -> String {
    let documents = try FileManager.default.url(
      for: .documentDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    return documents.appendingPathComponent("pretext-parity-ios.json").path
  }
}
