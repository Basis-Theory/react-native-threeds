import { Platform } from 'react-native';
import NativeBasisTheoryThreeDS from '../specs/NativeBasisTheoryThreeDS';
import type {
  CreateNativeThreeDSSessionRequest,
  NativeThreeDSConfiguration,
  NativeThreeDSResult,
  ThreeDSSession,
} from '../types';

const supportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Consumers can use this flag to keep a WebView fallback available while the
 * generated native projects are being installed or while running on web.
 */
export const isThreeDSTurboModuleAvailable = (): boolean =>
  supportedPlatform && NativeBasisTheoryThreeDS !== null;

const requireModule = () => {
  if (!supportedPlatform || NativeBasisTheoryThreeDS === null) {
    if (Platform.OS === 'android') {
      // React Native's Bridgeless runtime does not reach a registered Android
      // TurboModule, so this package only builds the Bridge on Android.
      throw new Error(
        'NativeBasisTheoryThreeDS (TurboModule) is not reachable on Android. ' +
          'This is a known React Native Bridgeless runtime limitation, not a ' +
          'missing install step; see "Choosing the native strategy" in the ' +
          'README. Use BasisTheoryThreeDSNative (Bridge) on Android instead.'
      );
    }

    throw new Error(
      'NativeBasisTheoryThreeDS is unavailable. Generate and rebuild the native app before using the TurboModule integration.'
    );
  }

  return NativeBasisTheoryThreeDS;
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

    // Codegen's Spec keeps `status` as `string` (the generated native
    // signatures cannot express a literal union); the public
    // NativeThreeDSResult narrows it to the fixed vocabulary the native SDK
    // actually returns (see src/types/index.d.ts).
    return requireModule().startAuthentication(sessionId) as Promise<NativeThreeDSResult>;
  },
};
