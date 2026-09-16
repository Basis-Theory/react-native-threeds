#import "BasisTheoryThreeDSTurbo.h"
#import <BasisTheoryThreeDSSpec/BasisTheoryThreeDSSpec.h>

#if __has_include(<BasisTheoryReactNativeThreeDS/BasisTheoryReactNativeThreeDS-Swift.h>)
#import <BasisTheoryReactNativeThreeDS/BasisTheoryReactNativeThreeDS-Swift.h>
#else
#import "BasisTheoryReactNativeThreeDS-Swift.h"
#endif

@interface BasisTheoryThreeDSTurbo () <NativeBasisTheoryThreeDSSpec>
@end

@implementation BasisTheoryThreeDSTurbo {
  BasisTheoryThreeDSSwift *_implementation;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _implementation = [BasisTheoryThreeDSSwift new];
  }
  return self;
}

+ (NSString *)moduleName
{
  return @"NativeBasisTheoryThreeDS";
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (void)configure:(NSString *)apiKey
authenticationEndpoint:(NSString *)authenticationEndpoint
       apiBaseUrl:(NSString *)apiBaseUrl
          sandbox:(BOOL)sandbox
           locale:(NSString *)locale
authenticationEndpointHeadersJson:(NSString *)authenticationEndpointHeadersJson
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject
{
  [_implementation configure:apiKey
       authenticationEndpoint:authenticationEndpoint
                   apiBaseUrl:apiBaseUrl
                      sandbox:sandbox
                       locale:locale
authenticationEndpointHeadersJson:authenticationEndpointHeadersJson
                      resolve:resolve
                       reject:reject];
}

- (void)createSession:(NSString *)tokenId
        tokenIntentId:(NSString *)tokenIntentId
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  [_implementation createSession:tokenId
                   tokenIntentId:tokenIntentId
                         resolve:resolve
                          reject:reject];
}

- (void)startAuthentication:(NSString *)sessionId
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject
{
  [_implementation startAuthentication:sessionId resolve:resolve reject:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeBasisTheoryThreeDSSpecJSI>(params);
}

@end
