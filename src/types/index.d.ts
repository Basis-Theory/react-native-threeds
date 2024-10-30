interface ThreeDSSession {
  id: string;
  cardBrand?: string;
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
}

export type {
  ThreeDSSession,
  Challenge,
  ChallengeResult,
}
