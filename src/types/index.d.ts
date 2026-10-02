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
 * The authentication result, the same on both platforms and strategies. The
 * native adapters map EMV transaction status codes (Y, A, N, U, R) to these
 * names. A cancelled, timed-out, or failed challenge resolves as `'failed'`,
 * with the reason in `NativeThreeDSResult.details`. `'decoupled_challenge'`
 * means the issuer authenticates outside the app, so get the outcome from Get
 * Challenge Result; `'informational'` means authentication wasn't requested.
 */
type ThreeDSAuthenticationStatus =
  | 'successful'
  | 'attempted'
  | 'failed'
  | 'unavailable'
  | 'rejected'
  | 'decoupled_challenge'
  | 'informational';

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
