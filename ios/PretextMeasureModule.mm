#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <objc/message.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNPretextSpec/RNPretextSpec.h>
using namespace facebook::react;

namespace {
using facebook::jsi::Runtime;
using facebook::jsi::Value;
using facebook::react::TurboModule;

facebook::jsi::Value installJSIHostFunction(
    Runtime &runtime,
    TurboModule &,
    const Value *,
    size_t) {
  pretext::install(runtime);
  return Value(true);
}

class PretextMeasureTurboModule final : public ObjCTurboModule {
 public:
  explicit PretextMeasureTurboModule(const ObjCTurboModule::InitParams &params)
      : ObjCTurboModule(params) {
    methodMap_["installJSI"] = MethodMetadata{0, installJSIHostFunction};
    methodMap_["installJSIAsync"] = MethodMetadata{0, installJSIHostFunction};
  }
};
} // namespace
#endif

#include <jsi/jsi.h>

#include "../cpp/PretextInstall.h"
#include "../cpp/PretextPlatformMeasure.h"
#include "../cpp/PretextTypes.h"

namespace {

std::optional<std::string> optionalStringFromDict(NSDictionary *dict, NSString *key)
{
  id value = dict[key];
  if (![value isKindOfClass:[NSString class]]) {
    return std::nullopt;
  }

  NSString *stringValue = (NSString *)value;
  return std::string([stringValue UTF8String]);
}

std::optional<double> optionalNumberFromDict(NSDictionary *dict, NSString *key)
{
  id value = dict[key];
  if (![value isKindOfClass:[NSNumber class]]) {
    return std::nullopt;
  }

  return ((NSNumber *)value).doubleValue;
}

std::optional<bool> optionalBoolFromDict(NSDictionary *dict, NSString *key)
{
  id value = dict[key];
  if (![value isKindOfClass:[NSNumber class]]) {
    return std::nullopt;
  }

  return ((NSNumber *)value).boolValue;
}

pretext::TextStyle parseStyleFromPayload(NSDictionary *style)
{
  pretext::TextStyle parsed;
  parsed.fontFamily = optionalStringFromDict(style, @"fontFamily");
  parsed.fontWeight = optionalStringFromDict(style, @"fontWeight");
  parsed.fontStyle = optionalStringFromDict(style, @"fontStyle");
  parsed.lineHeight = optionalNumberFromDict(style, @"lineHeight");
  parsed.letterSpacing = optionalNumberFromDict(style, @"letterSpacing");
  parsed.includeFontPadding = optionalBoolFromDict(style, @"includeFontPadding");

  id fontSizeValue = style[@"fontSize"];
  if ([fontSizeValue isKindOfClass:[NSNumber class]]) {
    parsed.fontSize = ((NSNumber *)fontSizeValue).doubleValue;
  }

  return parsed;
}

} // namespace

@interface PretextMeasureModule : NSObject <RCTBridgeModule
#ifdef RCT_NEW_ARCH_ENABLED
, NativePretextSpec
#endif
>
@property(nonatomic, weak) RCTBridge *bridge;
@end

@implementation PretextMeasureModule

RCT_EXPORT_MODULE(PretextMeasure)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void *)runtimePointerFromBridgeCandidate:(RCTBridge *)bridgeCandidate {
  if (bridgeCandidate == nil) {
    return nullptr;
  }

  SEL runtimeSelector = @selector(runtime);
  if (![bridgeCandidate respondsToSelector:runtimeSelector]) {
    return nullptr;
  }

  IMP runtimeImp = [bridgeCandidate methodForSelector:runtimeSelector];
  if (runtimeImp == nullptr) {
    return nullptr;
  }

  using RuntimeGetter = void *(*)(id, SEL);
  auto runtimeGetter = reinterpret_cast<RuntimeGetter>(runtimeImp);
  return runtimeGetter(bridgeCandidate, runtimeSelector);
}

- (BOOL)installIfPossible {
  if (self.bridge == nil) {
    return NO;
  }

  NSMutableSet<RCTBridge *> *visited = [NSMutableSet new];
  RCTBridge *bridgeCandidate = self.bridge;

  while (bridgeCandidate != nil && ![visited containsObject:bridgeCandidate]) {
    [visited addObject:bridgeCandidate];

    void *runtimePointer = [self runtimePointerFromBridgeCandidate:bridgeCandidate];
    if (runtimePointer != nullptr) {
      auto *runtime = reinterpret_cast<facebook::jsi::Runtime *>(runtimePointer);
      pretext::install(*runtime);
      return YES;
    }

    bridgeCandidate = bridgeCandidate.batchedBridge;
  }

  return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installJSI) {
  return @([self installIfPossible]);
}

RCT_REMAP_METHOD(
    installJSIAsync,
    installJSIAsyncWithResolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    resolve(@([self installIfPossible]));
  } @catch (NSException *exception) {
    reject(@"E_PRETEXT_INSTALL", exception.reason, nil);
  }
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(measureSync : (NSDictionary *)payload) {
  @try {
    NSString *text = [payload[@"text"] isKindOfClass:[NSString class]] ? payload[@"text"] : @"";
    NSNumber *widthNumber = [payload[@"width"] isKindOfClass:[NSNumber class]] ? payload[@"width"] : @(1);
    NSDictionary *styleDict = [payload[@"style"] isKindOfClass:[NSDictionary class]] ? payload[@"style"] : @{};
    NSNumber *maxLinesNumber = [payload[@"maxLines"] isKindOfClass:[NSNumber class]] ? payload[@"maxLines"] : nil;

    const pretext::TextStyle style = parseStyleFromPayload(styleDict);
    std::optional<int> maxLines = std::nullopt;
    if (maxLinesNumber != nil) {
      const int value = maxLinesNumber.intValue;
      if (value > 0) {
        maxLines = value;
      }
    }

    const double measured = pretext::measureHeightPlatform(
        std::string([text UTF8String]),
        style,
        widthNumber.doubleValue,
        maxLines);
    return @(measured);
  } @catch (NSException *exception) {
    return @(-1);
  }
}

- (void)setBridge:(RCTBridge *)bridge {
  _bridge = bridge;
  [self installIfPossible];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params {
  return std::make_shared<PretextMeasureTurboModule>(params);
}
#endif

@end
