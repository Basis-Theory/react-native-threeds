#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Codegen owns this Objective-C++ interface. The implementation forwards each
 * method to Swift so that React Native-specific glue stays separate from the
 * iOS 3DS orchestration logic.
 */
@interface BasisTheoryThreeDSTurbo : NSObject
@end

NS_ASSUME_NONNULL_END
