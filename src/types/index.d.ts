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

export type { ThreeDSSession, Challenge, ChallengeResult, CreateThreeDSSessionRequest };
