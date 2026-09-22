#import <React/RCTBridgeModule.h>

// Swift classes are not discovered by the legacy React Native bridge on their
// own. This Objective-C declaration exports the Swift selectors as Promise-based
// JavaScript methods without adding business logic to the Objective-C layer.
//
// Only compiled in when RCT_NEW_ARCH_ENABLED != 1 — see
// BasisTheoryReactNativeThreeDS.podspec and
// docs/REGISTRATION-AND-PACKAGING.md.
@interface RCT_EXTERN_MODULE(BasisTheoryThreeDS, NSObject)

// Initializes the native SDK with public app configuration and the merchant's
// server-side authentication endpoint.
RCT_EXTERN_METHOD(configure:(NSDictionary *)configuration
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Creates an app-based 3DS session from a token or token-intent reference.
RCT_EXTERN_METHOD(createSession:(NSDictionary *)request
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Authenticates the active session and presents a native challenge if required.
RCT_EXTERN_METHOD(startAuthentication:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
