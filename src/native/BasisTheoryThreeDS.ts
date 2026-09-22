import { NativeModules, Platform } from 'react-native';
import type {
  CreateNativeThreeDSSessionRequest,
  NativeThreeDSConfiguration,
  NativeThreeDSResult,
  ThreeDSSession,
} from '../types';

/**
 * Shape exported by the Swift and Kotlin modules through React Native's legacy
 * bridge. Keeping this interface private prevents native implementation
 * details from becoming part of the public SDK contract.
 *
 * The New Architecture comparison replaces this handwritten declaration with
 * a Codegen contract while preserving the same public operations.
 */
interface NativeThreeDSModule {
  configure(configuration: NativeThreeDSConfiguration): Promise<string[]>;
  createSession(
    request: CreateNativeThreeDSSessionRequest
  ): Promise<ThreeDSSession>;
  startAuthentication(sessionId: string): Promise<NativeThreeDSResult>;
}

// This is where legacy-bridge registration surfaces in JavaScript:
// `NativeModules.BasisTheoryThreeDS` is only populated if
// BasisTheoryThreeDSBridgePackage.kt (Android) or the RCT_EXTERN_MODULE
// declaration in BasisTheoryThreeDSBridge.m (iOS) actually compiled into this
// build. See docs/REGISTRATION-AND-PACKAGING.md for the full path from a
// Kotlin/Swift class to this lookup.
//
// NativeModules is populated only in custom iOS and Android builds. Expo Go and
// web leave this value undefined and continue using the WebView implementation.
const nativeModule = NativeModules.BasisTheoryThreeDS as
  | NativeThreeDSModule
  | undefined;

const requireNativeModule = (): NativeThreeDSModule => {
  if (!['ios', 'android'].includes(Platform.OS) || !nativeModule) {
    throw new Error(
      'BasisTheoryThreeDS is unavailable. Use a native build with the bridge linked.'
    );
  }

  return nativeModule;
};

/** Whether the current runtime contains the linked legacy 3DS bridge. */
export const isNativeThreeDSAvailable =
  ['ios', 'android'].includes(Platform.OS) && nativeModule != null;

/**
 * Promise-based JavaScript facade for the native iOS and Android 3DS flow.
 *
 * The facade validates inexpensive cross-platform invariants before entering
 * native code. Swift repeats security-sensitive validation because JavaScript
 * callers can bypass this wrapper and invoke NativeModules directly.
 */
export const BasisTheoryThreeDSNative = {
  /** Initializes the platform 3DS SDK. Call once before checkout. */
  configure(configuration: NativeThreeDSConfiguration): Promise<string[]> {
    return requireNativeModule().configure(configuration);
  },

  /** Creates the native app session and captures SDK-generated device data. */
  createSession(
    request: CreateNativeThreeDSSessionRequest
  ): Promise<ThreeDSSession> {
    // Exactly one reference identifies the card while keeping raw PAN data out
    // of this native API.
    const hasTokenId = request.tokenId != null;
    const hasTokenIntentId = request.tokenIntentId != null;

    if (hasTokenId === hasTokenIntentId) {
      return Promise.reject(
        new Error('Provide either tokenId or tokenIntentId, but not both.')
      );
    }

    return requireNativeModule().createSession(request);
  },

  /**
   * Runs merchant authentication and presents the native challenge when the
   * issuer requests one. Non-challenge outcomes resolve through the same result.
   */
  startAuthentication(sessionId: string): Promise<NativeThreeDSResult> {
    if (!sessionId) {
      return Promise.reject(new Error('sessionId is required.'));
    }

    return requireNativeModule().startAuthentication(sessionId);
  },
};
