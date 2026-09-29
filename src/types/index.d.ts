interface ThreeDSSession {
  id: string;
  cardBrand?: string;
  additionalCardBrands?: string[];
}

interface Challenge {
  sessionId: string;
  acsChallengeUrl: string;
  acsTransactionId: string;
  threeDSVersion: string;
  windowSize?: string;
  timeout?: number;
}

interface ChallengeResult {
  id: string;
  isCompleted?: boolean;
  authenticationStatus?: string;
}

interface CreateThreeDSSessionRequest {
  tokenId?: string;
  tokenIntentId?: string;
  /**
   * @deprecated Use `tokenId` instead
   */
  pan?: string;
}

interface NativeThreeDSConfiguration {
  apiKey: string;
  authenticationEndpoint: string;
  apiBaseUrl?: string;
  sandbox?: boolean;
  locale?: string;
  authenticationEndpointHeaders?: Record<string, string>;
}

interface CreateNativeThreeDSSessionRequest {
  tokenId?: string;
  tokenIntentId?: string;
}

/**
 * EMV 3DS transaction status codes translated to human-readable strings by
 * the native 3DS SDK, identically on both platforms:
 * android-threeds `lib/src/main/java/com/basistheory/threeds/service/ThreeDSService.kt`
 * (`transactionStatusMap`) and ios-threeds
 * `ThreeDS/Sources/ThreeDS/ChallengeHandler.swift`. A cancelled or timed-out
 * challenge still resolves as `'failed'`; the reason is carried in
 * `NativeThreeDSResult.details` instead of a separate status value.
 */
type ThreeDSAuthenticationStatus =
  | 'successful'
  | 'attempted'
  | 'failed'
  | 'unavailable'
  | 'rejected';

interface NativeThreeDSResult {
  id: string;
  status: ThreeDSAuthenticationStatus;
  details?: string;
}

export type {
  ThreeDSSession,
  Challenge,
  ChallengeResult,
  CreateThreeDSSessionRequest,
  NativeThreeDSConfiguration,
  CreateNativeThreeDSSessionRequest,
  NativeThreeDSResult,
  ThreeDSAuthenticationStatus,
};
