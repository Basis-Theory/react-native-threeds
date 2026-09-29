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
 * Android only exposes `bridge`: React Native's Bridgeless runtime does not
 * expose `__turboModuleProxy` on Android even when the Kotlin TurboModule
 * registers successfully, regardless of the architecture flag, so there is no
 * supported Android TurboModule integration to offer here (see the
 * investigation in the ENG-12518 branch/PR history). `android/build.gradle`
 * always compiles and autolinks the Bridge adapter on Android for the same
 * reason.
 *
 * `BasisTheoryThreeDSTurbo` remains available as a direct import (not through
 * this matrix) for anyone investigating the Android TurboModule gap; it still
 * throws the actionable error described above if used there.
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
 * everywhere else, including all of Android, where TurboModule is not
 * reachable regardless of the architecture flag.
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
