import { Platform } from 'react-native';
import NativeBasisTheoryThreeDS from '../specs/NativeBasisTheoryThreeDS';
import type {
  CreateNativeThreeDSSessionRequest,
  NativeThreeDSConfiguration,
  NativeThreeDSResult,
  ThreeDSSession,
} from '../types';
import {
  hasExactlyOneTokenReference,
  TOKEN_REFERENCE_ERROR,
} from './tokenReference';

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
      // This package only builds the Bridge on Android.
      throw new Error(
        'The Android TurboModule is not supported in this package; use ' +
          'BasisTheoryThreeDSNative (Bridge) on Android.'
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
    if (!hasExactlyOneTokenReference(request)) {
      return Promise.reject(new Error(TOKEN_REFERENCE_ERROR));
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
