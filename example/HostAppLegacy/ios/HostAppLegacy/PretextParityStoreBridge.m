#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PretextParityStore, NSObject)

RCT_EXTERN_METHOD(
  writeParityRows:(NSString *)payload
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getParityRowsFilePath:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
