export { BasisTheory3dsProvider } from './BasisTheory3dsProvider';
export { useBasisTheory3ds } from './useBasisTheory3ds';
export {
  BasisTheoryThreeDSNative,
  isNativeThreeDSAvailable,
} from './native/BasisTheoryThreeDS';
export {
  BasisTheoryThreeDSTurbo,
  isThreeDSTurboModuleAvailable,
} from './native/BasisTheoryThreeDSTurbo';

export type {
  ThreeDSSession,
  Challenge,
  ChallengeResult,
  NativeThreeDSConfiguration,
  CreateNativeThreeDSSessionRequest,
  NativeThreeDSResult,
  ThreeDSAuthenticationStatus,
} from './types';

import { Platform } from 'react-native';
import { BasisTheoryThreeDSNative } from './native/BasisTheoryThreeDS';
import {
  BasisTheoryThreeDSTurbo,
  isThreeDSTurboModuleAvailable,
} from './native/BasisTheoryThreeDSTurbo';

/**
 * Explicit per-platform integration matrix. Consumers pick the strategy that
 * fits their app instead of relying on an implicit platform default.
 *
 * iOS always compiles the Bridge and adds the TurboModule on the new
 * architecture. Android only ships the Bridge: the Android TurboModule isn't
 * supported in this package.
 *
 * `BasisTheoryThreeDSTurbo` is still exported for direct use on iOS; on
 * Android it throws an actionable error instead of failing silently.
 */
export const BasisTheoryThreeDSStrategies = {
  ios: {
    bridge: BasisTheoryThreeDSNative,
    turboModule: BasisTheoryThreeDSTurbo,
  },
  android: {
    bridge: BasisTheoryThreeDSNative,
  },
} as const;

/**
 * Convenience default for consumers who don't want to branch on `Platform`
 * themselves. Prefers the TurboModule on iOS when the client's build actually
 * compiled it (`isThreeDSTurboModuleAvailable()`); falls back to Bridge
 * everywhere else, including all of Android.
 *
 * This is evaluated once at import time because native module availability
 * cannot change during the app's lifetime — it was decided at compile time.
 *
 * Consumers who need explicit control over the strategy — for testing, or to
 * force a specific adapter — should use `BasisTheoryThreeDSStrategies`
 * instead.
 */
export const BasisTheoryThreeDS =
  Platform.OS === 'ios' && isThreeDSTurboModuleAvailable()
    ? BasisTheoryThreeDSTurbo
    : BasisTheoryThreeDSNative;
