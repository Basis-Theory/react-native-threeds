import React, { createContext, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';
import { v4 as uuid } from './utils/uuid';
import type {
  CompleteChallengeMessage,
  CreateSessionMessage,
  ErrorMessage,
  WebViewMessage,
} from './types/messages';
import type {
  Challenge,
  CreateThreeDSSessionRequest,
  ThreeDSSession,
} from './types';

interface PendingPromise {
  // just a generic promise, don't need to adhere to types
  /* eslint-disable @typescript-eslint/no-explicit-any */
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

interface BasisTheory3dsContextProps {
  createSession: (req: CreateThreeDSSessionRequest) => Promise<ThreeDSSession>;
  startChallenge: (challenge: Challenge) => Promise<boolean>;
}

export const BasisTheory3dsContext =
  createContext<BasisTheory3dsContextProps | null>(null);

interface Props {
  apiKey: string;
  apiBaseUrl?: string;
  scriptSrc?: string;
  children: React.ReactNode;
}

export const BasisTheory3dsProvider: React.FC<Props> = ({
  apiKey,
  children,
  apiBaseUrl = 'https://api.basistheory.com',
  scriptSrc = 'https://3ds.basistheory.com',
}) => {
  const webViewRef = useRef<WebView>(null);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [pendingPromises] = useState<Map<string, PendingPromise>>(new Map());

  const initJavascript = `
    (function () {
      var metaCSP = document.createElement("meta");
      metaCSP.setAttribute("http-equiv", "Content-Security-Policy");
      metaCSP.setAttribute("content", "default-src 'self' ${scriptSrc}; script-src 'self' ${scriptSrc}; frame-src https:");

      var metaViewport = document.createElement("meta");
      metaViewport.setAttribute("name", "viewport");
      metaViewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
      document.head.appendChild(metaViewport);

      try {
        const script = document.createElement("script");
        script.src = ${JSON.stringify(scriptSrc)};

        script.onload = async function () {
          window.bt3ds = BasisTheory3ds(${JSON.stringify(apiKey)}, {
            apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
          });

          const challengeFrameContainer = document.getElementById(
            "challengeFrameContainer"
          );

          if (challengeFrameContainer) {
            challengeFrameContainer.style.display = "flex";
            challengeFrameContainer.style.position = "absolute";
            challengeFrameContainer.style.width = "100%";
            challengeFrameContainer.style.height = "100%";
            challengeFrameContainer.style.top = "0";
            challengeFrameContainer.style.left = "0";
            challengeFrameContainer.style.alignItems = "center";
            challengeFrameContainer.style.justifyContent = "center";
          }
        };

        document.head.appendChild(script);
      } catch (e) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ error: e.message })
        );
      }
    })();
  `;

  const runJavascript = (js: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  };

  const onMessage = (event: WebViewMessageEvent) => {
    const data: WebViewMessage = JSON.parse(event.nativeEvent.data);
    const { type, promiseId } = data;

    if (!promiseId) {
      // discard messages that are not trying to resolve a pending promise
      return;
    }

    if (pendingPromises.has(promiseId)) {
      const { resolve, reject } = pendingPromises.get(promiseId)!;

      if ('error' in data) {
        setWebViewVisible(false);
        reject(new Error((data as ErrorMessage).error));
      } else {
        switch (type) {
          case 'createSession': {
            resolve((data as CreateSessionMessage).session);
            break;
          }
          case 'completeChallenge': {
            setWebViewVisible(false);
            resolve((data as CompleteChallengeMessage).challengeComplete);
            break;
          }
          default: {
            reject(new Error('Unknown message received.'));
          }
        }
      }

      pendingPromises.delete(promiseId);
    }
  };

  const createSession = ({
    tokenId,
    tokenIntentId,
    pan,
  }: CreateThreeDSSessionRequest) => {
    return new Promise<ThreeDSSession>((resolve, reject) => {
      const params = { tokenId, tokenIntentId, pan };

      const providedParam = Object.entries(params).find(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, value]) => value != null
      ) as [string, string] | undefined;

      if (!providedParam) {
        reject(
          new Error(
            'A tokenId, tokenIntentId, or pan is required to create a session.'
          )
        );
        return;
      }

      const additionalParamExists = Object.entries(params).some(
        ([key, value]) => value != null && key !== providedParam[0]
      );

      if (additionalParamExists) {
        reject(
          new Error(
            'Only one of tokenId, tokenIntentId, or pan should be provided.'
          )
        );
        return;
      }

      const [paramName, paramValue] = providedParam;
      const paramObjectString = JSON.stringify({ [paramName]: paramValue });

      const promiseId = uuid();
      pendingPromises.set(promiseId, { resolve, reject });

      const createSessionJs = `
        (function () {
          if (window.bt3ds) {
            try {
              const session = bt3ds
                .createSession(${paramObjectString})
                .then(function (session) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({type: "createSession", promiseId: "${promiseId}", session: session }));
                })
                .catch(function (error) {
                  window.ReactNativeWebView.postMessage(
                    JSON.stringify({ type: "createSession", promiseId: "${promiseId}", error: JSON.stringify(error) })
                  );
                });
            } catch (e) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "createSession", promiseId: "${promiseId}", error: JSON.stringify(error) })
              );
            }
          }
          return true;
        })();
      `;

      runJavascript(createSessionJs);
    });
  };

  const startChallenge = (challenge: Challenge) => {
    return new Promise<boolean>((resolve, reject) => {
      if (!challenge) {
        reject(new Error('A challenge is required to start a challenge.'));
        return;
      }

      const promiseId = uuid();
      pendingPromises.set(promiseId, { resolve, reject });

      const startChallengeJs = `
        (function () {
          if (window.bt3ds) {
            try {
              const challengeParams = {
                sessionId: ${JSON.stringify(challenge.sessionId)},
                acsChallengeUrl: ${JSON.stringify(challenge.acsChallengeUrl)},
                acsTransactionId: ${JSON.stringify(challenge.acsTransactionId)},
                threeDSVersion: ${JSON.stringify(challenge.threeDSVersion)},
                windowSize: ${JSON.stringify(challenge.windowSize)},
                timeout: ${challenge.timeout}
              };

              bt3ds
                .startChallenge(challengeParams)
                .then(function (challengeResult) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({type: "completeChallenge", promiseId: "${promiseId}", challengeComplete: true }));
                })
                .catch(function (error) {
                  window.ReactNativeWebView.postMessage(
                    JSON.stringify({ type: "completeChallenge", promiseId: "${promiseId}", error: JSON.stringify(error) })
                  );
                });
            } catch (e) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "completeChallenge", promiseId: "${promiseId}", error: JSON.stringify(error) })
              );
            }
          }
          return true;
        })();
      `;

      runJavascript(startChallengeJs);
      setWebViewVisible(true);
    });
  };

  return (
    <BasisTheory3dsContext.Provider value={{ createSession, startChallenge }}>
      {children}
      <View
        style={webViewVisible ? styles.webViewContainer : styles.hiddenWebView}
      >
        <WebView
          testID="basis-theory-3ds-webview"
          ref={webViewRef}
          originWhitelist={['https://*']}
          onMessage={onMessage}
          javaScriptEnabled={true}
          onError={(error) => console.error(error)}
          onLoad={() => webViewRef.current?.injectJavaScript(initJavascript)}
          mixedContentMode="never"
          contentMode="mobile"
          style={styles.webView}
          source={{ html: '<html></html>' }}
        />
      </View>
    </BasisTheory3dsContext.Provider>
  );
};

const bgColor = '#fff';

const styles = StyleSheet.create({
  webViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: bgColor,
    zIndex: 1000,
  },
  hiddenWebView: {
    opacity: 0,
    pointerEvents: 'none',
  },
  webView: {
    flex: 1,
  },
});

export default BasisTheory3dsProvider;
