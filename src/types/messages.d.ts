interface WebViewMessage {
  type: string;
  promiseId?: string;
}

interface CreateSessionMessage extends WebViewMessage {
  type: 'createSession';
  session: ThreeDSSession;
}

interface CompleteChallengeMessage extends WebViewMessage {
  type: 'completeChallenge';
  challengeComplete: boolean;
}

interface ErrorMessage extends WebViewMessage {
  error: string;
}

export type {
  WebViewMessage,
  CreateSessionMessage,
  CompleteChallengeMessage,
  ErrorMessage,
};
