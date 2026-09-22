import { NativeModules, Platform } from 'react-native';
import CodegenNativeBasisTheoryThreeDS, {
  type Spec,
} from '../specs/NativeBasisTheoryThreeDS';
import type {
  CreateNativeThreeDSSessionRequest,
  NativeThreeDSConfiguration,
  NativeThreeDSResult,
  ThreeDSSession,
} from '../types';

const supportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

type TurboModuleProxy = (name: string) => Spec | null;

type ReactNativeRuntimeGlobals = typeof globalThis & {
  RN$Bridgeless?: boolean;
  RN$TurboInterop?: boolean;
  RN$UnifiedNativeModuleProxy?: boolean;
  __turboModuleProxy?: TurboModuleProxy;
};

const getNativeBasisTheoryThreeDS = (): Spec | null => {
  // This is where TurboModule registration surfaces in JavaScript. It only
  // resolves if BasisTheoryThreeDSTurboPackage.kt (Android) or
  // BasisTheoryThreeDSTurbo.mm (iOS) actually compiled into this build — see
  // docs/REGISTRATION-AND-PACKAGING.md for the full path from a Kotlin/Swift
  // class to this lookup.
  //
  // Read the current proxy as well as Codegen's module result so this POC can
  // distinguish registration failures from a host that did not install JSI.
  const runtimeGlobals = globalThis as ReactNativeRuntimeGlobals;
  const turboModuleProxy = runtimeGlobals.__turboModuleProxy;
  const legacyModule = NativeModules?.NativeBasisTheoryThreeDS as
    | Spec
    | null
    | undefined;
  const nativeModule =
    turboModuleProxy?.('NativeBasisTheoryThreeDS') ??
    legacyModule ??
    CodegenNativeBasisTheoryThreeDS;

  console.info('[BT3DSTurbo] registry lookup', {
    available: nativeModule !== null,
    legacyModuleAvailable: legacyModule != null,
    legacyModuleRegistered: legacyModule !== undefined,
    bridgeless: runtimeGlobals.RN$Bridgeless ?? false,
    turboInterop: runtimeGlobals.RN$TurboInterop ?? false,
    unifiedNativeModuleProxy:
      runtimeGlobals.RN$UnifiedNativeModuleProxy ?? false,
    turboModuleProxyAvailable: turboModuleProxy !== undefined,
    reactNativeVersion: Platform.constants?.reactNativeVersion,
  });

  return nativeModule;
};

/**
 * Consumers can use this flag to keep a WebView fallback available while the
 * generated native projects are being installed or while running on web.
 */
export const isThreeDSTurboModuleAvailable = (): boolean =>
  supportedPlatform && getNativeBasisTheoryThreeDS() !== null;

const requireModule = () => {
  const nativeModule = getNativeBasisTheoryThreeDS();
  if (!supportedPlatform || nativeModule === null) {
    if (Platform.OS === 'android') {
      // global.__turboModuleProxy is confirmed absent on Android Bridgeless
      // hosts even when the Kotlin module registers successfully. This is a
      // React Native runtime limitation, not a missing install step — use
      // BasisTheoryThreeDSNative (Bridge) on Android instead. Details:
      // docs/ANDROID-TURBOMODULE-INVESTIGATION.md
      throw new Error(
        'NativeBasisTheoryThreeDS (TurboModule) is not reachable on Android. ' +
          'This is a known React Native Bridgeless runtime limitation, not a ' +
          'missing install step — see docs/ANDROID-TURBOMODULE-INVESTIGATION.md. ' +
          'Use BasisTheoryThreeDSNative (Bridge) on Android instead.'
      );
    }

    throw new Error(
      'NativeBasisTheoryThreeDS is unavailable. Generate and rebuild the native app before using the TurboModule integration.'
    );
  }

  return nativeModule;
};

/**
 * This facade keeps React Native Codegen primitives out of the public API. A
 * future SDK can evolve this object without changing the generated contract.
 */
export const BasisTheoryThreeDSTurbo = {
  configure: (configuration: NativeThreeDSConfiguration) =>
    requireModule().configure(
      configuration.apiKey,
      configuration.authenticationEndpoint,
      configuration.apiBaseUrl ?? '',
      configuration.sandbox ?? false,
      configuration.locale ?? '',
      JSON.stringify(configuration.authenticationEndpointHeaders ?? {})
    ),

  createSession: (request: CreateNativeThreeDSSessionRequest) => {
    const hasTokenId = Boolean(request.tokenId);
    const hasTokenIntentId = Boolean(request.tokenIntentId);

    if (hasTokenId === hasTokenIntentId) {
      return Promise.reject(
        new Error('Provide exactly one of tokenId or tokenIntentId.')
      );
    }

    return requireModule().createSession(
      request.tokenId ?? '',
      request.tokenIntentId ?? ''
    ) as Promise<ThreeDSSession>;
  },

  startAuthentication: (sessionId: string): Promise<NativeThreeDSResult> => {
    if (!sessionId) {
      return Promise.reject(new Error('sessionId is required.'));
    }

    return requireModule().startAuthentication(sessionId);
  },
};
