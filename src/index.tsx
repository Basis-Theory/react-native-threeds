// exports
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
} from './types';

// imports for current file
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
 * Only one native adapter is ever compiled into a given build per platform
 * (Android: `android/build.gradle` source-set exclusion; iOS: the podspec's
 * `RCT_NEW_ARCH_ENABLED` branch) — see docs/REGISTRATION-AND-PACKAGING.md for
 * the full registration and packaging diagrams. The unselected strategy is
 * always a safe no-op: its facade reports itself unavailable rather than
 * referencing code that was never compiled.
 *
 * `android.turboModule` is exposed for completeness and future
 * investigation, but calling it throws today regardless of the architecture
 * flag: React Native's Bridgeless runtime does not expose
 * `__turboModuleProxy` on Android even when the Kotlin module registers
 * successfully. See docs/ANDROID-TURBOMODULE-INVESTIGATION.md before
 * choosing it.
 */
export const BasisTheoryThreeDSStrategies = {
  ios: {
    bridge: BasisTheoryThreeDSNative,
    turboModule: BasisTheoryThreeDSTurbo,
  },
  android: {
    bridge: BasisTheoryThreeDSNative,
    turboModule: BasisTheoryThreeDSTurbo,
  },
} as const;

/**
 * Convenience default for consumers who don't want to branch on `Platform`
 * themselves. Prefers the TurboModule on iOS when the client's build actually
 * compiled it (`isThreeDSTurboModuleAvailable()`); falls back to Bridge
 * everywhere else, including all of Android, where TurboModule is not
 * reachable regardless of the architecture flag (see
 * docs/ANDROID-TURBOMODULE-INVESTIGATION.md).
 *
 * This is evaluated once at import time because native module availability
 * cannot change during the app's lifetime — it was decided at compile time
 * (see docs/REGISTRATION-AND-PACKAGING.md).
 *
 * Consumers who need explicit control over the strategy — for testing, or to
 * force a specific adapter — should use `BasisTheoryThreeDSStrategies`
 * instead.
 */
export const BasisTheoryThreeDS =
  Platform.OS === 'ios' && isThreeDSTurboModuleAvailable()
    ? BasisTheoryThreeDSTurbo
    : BasisTheoryThreeDSNative;
