import React from 'react';
import { render, act, renderHook } from '@testing-library/react-native';
import { BasisTheory3dsProvider, ThreeDSSession, useBasisTheory3ds } from '../index';
import { Text, View } from 'react-native';

jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

const refOverride = {
  goBack: jest.fn(),
  goForward: jest.fn(),
  reload: jest.fn(),
  stopLoading: jest.fn(),
  injectJavaScript: jest.fn(),
  requestFocus: jest.fn(),
  postMessage: jest.fn(),
  clearFormData: jest.fn(),
  clearCache: jest.fn(),
  clearHistory: jest.fn(),
};

jest.mock('react-native-webview', () => {
  // just mocking component, don't need to adhere to types
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockWebView = React.forwardRef((props: any, ref: React.Ref<any>) => {
    React.useImperativeHandle(ref, () => refOverride);

    return <View {...props} />;
  });

  return {
    __esModule: true,
    WebView: MockWebView,
    default: MockWebView,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders children correctly', () => {
  const { getByText } = render(
    <BasisTheory3dsProvider apiKey="test-api-key">
      <Text>Test Child</Text>
    </BasisTheory3dsProvider>
  );

  expect(getByText('Test Child')).toBeTruthy();
});

test('createSession calls injectJavaScript on WebView', () => {
  const { result } = renderHook(() => useBasisTheory3ds(), {
    wrapper: ({ children }) => (
      <BasisTheory3dsProvider apiKey="test-api-key">
        {children}
      </BasisTheory3dsProvider>
    ),
  });

  void result.current.createSession({ tokenId: 'token-id' });

  expect(refOverride.injectJavaScript).toHaveBeenCalled();
});

test('createSession resolves with session data', async () => {
  const sessionData = {
    id: 'session-id',
    cardBrand: 'Visa',
    additionalCardBrands: ['Visa', 'Cartes Bancaires']
  };
  let createSessionPromise: Promise<ThreeDSSession> | undefined;

  const TestComponent = () => {
    const context = useBasisTheory3ds();
    if (!context) throw new Error('No context found');

    createSessionPromise = context.createSession({ tokenId: 'token-id' });
    return <Text>Test Child</Text>;
  };

  const { getByTestId } = render(
    <BasisTheory3dsProvider apiKey="test-api-key">
      <TestComponent />
    </BasisTheory3dsProvider>
  );

  const message = {
    nativeEvent: {
      data: JSON.stringify({
        type: 'createSession',
        promiseId: 'test-uuid',
        session: sessionData,
      }),
    },
  };

  const webView = getByTestId('basis-theory-3ds-webview');
  await act(() => (webView.props.onMessage as (msg: unknown) => Promise<void>)(message));

  await expect(createSessionPromise).resolves.toEqual(sessionData);
});

test('startChallenge calls injectJavaScript on WebView', () => {
  const { result } = renderHook(() => useBasisTheory3ds(), {
    wrapper: ({ children }) => (
      <BasisTheory3dsProvider apiKey="test-api-key">
        {children}
      </BasisTheory3dsProvider>
    ),
  });

  act(() => {
    void result.current.startChallenge({
      sessionId: 'session-id',
      acsChallengeUrl: 'https://acs.challenge.url',
      acsTransactionId: 'transaction-id',
      threeDSVersion: '2.1.0',
      windowSize: '03',
      timeout: 600,
    });
  });

  expect(refOverride.injectJavaScript).toHaveBeenCalled();
});

test('startChallenge resolves', async () => {
  const challengeResult = true;
  let startChallengePromise: Promise<boolean> | undefined;

  const TestComponent = () => {
    const context = useBasisTheory3ds();
    if (!context) throw new Error('No context found');

    React.useEffect(() => {
      // catching the promise explicitly, awaited on the msg act
      // eslint-disable-next-line @typescript-eslint/require-await
      void (async () => {
        startChallengePromise = context.startChallenge({
          sessionId: 'session-id',
          acsChallengeUrl: 'https://acs.challenge.url',
          acsTransactionId: 'transaction-id',
          threeDSVersion: '2.1.0',
          windowSize: '03',
          timeout: 600,
        });
      })();
    }, [context]);

    return <Text>Test Child</Text>;
  };

  const { getByTestId } = render(
    <BasisTheory3dsProvider apiKey="test-api-key">
      <TestComponent />
    </BasisTheory3dsProvider>
  );

  const message = {
    nativeEvent: {
      data: JSON.stringify({
        type: 'completeChallenge',
        promiseId: 'test-uuid',
        challengeComplete: challengeResult,
      }),
    },
  };

  const webView = getByTestId('basis-theory-3ds-webview');

  await act(async () => {
    void (webView.props.onMessage as (msg: unknown) => Promise<void>)(message)

    // directly awaiting the promise because of the way jest works w/ act
    const resolvedValue = await startChallengePromise;
    expect(resolvedValue).toEqual(challengeResult);
  });
});
