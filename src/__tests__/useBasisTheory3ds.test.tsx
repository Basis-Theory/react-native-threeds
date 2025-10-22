import 'react-native';
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { BasisTheory3dsProvider, useBasisTheory3ds } from '../index';
import { View } from 'react-native';

jest.mock('../utils/uuid', () => ({
  v4: () => 'test-uuid',
}));

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

test('throws error when used outside of BasisTheory3dsProvider', () => {
  const { result } = renderHook(() => useBasisTheory3ds());
  expect(result.error).toEqual(
    new Error('useBasisTheory3ds must be used within a BasisTheory3dsProvider')
  );
});

test('provides createSession and startChallenge when used within BasisTheory3dsProvider', () => {
  const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <BasisTheory3dsProvider apiKey="test-api-key">
      {children}
    </BasisTheory3dsProvider>
  );

  const { result } = renderHook(() => useBasisTheory3ds(), { wrapper });

  expect(typeof result.current.createSession).toBe('function');
  expect(typeof result.current.startChallenge).toBe('function');
});
