import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Button,
  View,
  ActivityIndicator,
  Text,
  Pressable,
} from 'react-native';
import {
  BasisTheoryThreeDSNative,
  BasisTheory3dsProvider,
  isNativeThreeDSAvailable,
  useBasisTheory3ds,
} from '@basis-theory/react-native-threeds';
import type { ThreeDSSession } from '@basis-theory/react-native-threeds';
import Toast from 'react-native-toast-message';
import { CardPicker } from './components/CardPicker';
import { CardInput } from './components/CardInput';
import { authenticateSession, tokenize } from './services/api';

type NativeThreeDSStatus = 'initializing' | 'ready' | 'unavailable' | 'failed';

type Renderer = 'webview' | 'bridge';

const nativeThreeDSStatusText: Record<NativeThreeDSStatus, string> = {
  initializing: 'Initializing native 3DS',
  ready: 'Native 3DS ready',
  unavailable: 'Native 3DS unavailable',
  failed: 'Native 3DS initialization failed',
};

const App: React.FC = () => {
  const apiBaseUrl = process.env.API_BASE_URL;
  const scriptSrc = process.env.SCRIPT_SRC;
  const apiKey = process.env.PUBLIC_API_KEY ?? '';

  return (
    // Keep the existing WebView provider mounted so the feature flag below can
    // compare both implementations without maintaining two example apps.
    <BasisTheory3dsProvider
      apiBaseUrl={apiBaseUrl}
      scriptSrc={scriptSrc}
      apiKey={apiKey}
    >
      <MainScreen />
    </BasisTheory3dsProvider>
  );
};

const MainScreen: React.FC = () => {
  // These functions belong to the original WebView implementation and remain
  // available on both platforms for an apples-to-apples comparison.
  const { createSession, startChallenge } = useBasisTheory3ds();

  // The environment flag selects the startup value, while the visible control
  // lets a developer compare renderers without restarting Metro.
  const nativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
  const initialRenderer: Renderer =
    nativePlatform && process.env.USE_NATIVE_3DS === 'true'
      ? 'bridge'
      : 'webview';

  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const [renderer, setRenderer] = React.useState<Renderer>(initialRenderer);
  const [cardNumber, setCardNumber] =
    React.useState<string>('4200000000000002');
  const [nativeStatus, setNativeStatus] =
    React.useState<NativeThreeDSStatus>('initializing');
  const useNativeThreeDS = renderer === 'bridge';

  React.useEffect(() => {
    if (!useNativeThreeDS) {
      return;
    }

    setNativeStatus('initializing');
    if (!isNativeThreeDSAvailable) {
      setNativeStatus('unavailable');
      Toast.show({
        type: 'error',
        text1: 'Native 3DS module is unavailable',
      });
      return;
    }

    // Only public mobile configuration crosses the bridge. The private key
    // stays in the local backend configured by AUTHENTICATION_ENDPOINT.
    void BasisTheoryThreeDSNative.configure({
      apiKey: process.env.PUBLIC_API_KEY ?? '',
      authenticationEndpoint: process.env.AUTHENTICATION_ENDPOINT ?? '',
      apiBaseUrl: process.env.API_BASE_URL,
      sandbox: process.env.API_BASE_URL?.includes('flock-dev') ?? false,
    })
      .then(() => setNativeStatus('ready'))
      .catch((error) => {
        setNativeStatus('failed');
        console.error(error);
      });
  }, [useNativeThreeDS]);

  const checkout = async () => {
    try {
      setIsBusy(true);
      const token = await tokenize(cardNumber);

      if (!token) {
        throw new Error('Unable to create a token.');
      }

      // Tokenization happens before selecting a renderer, so neither the native
      // bridge nor the existing WebView session API receives a raw PAN here.
      const session: ThreeDSSession = useNativeThreeDS
        ? await BasisTheoryThreeDSNative.createSession({ tokenId: token.id })
        : await createSession({ tokenId: token.id });

      if (useNativeThreeDS) {
        // The platform SDK owns merchant authentication and any native
        // challenge. JavaScript receives the same semantic result on both OSes.
        const result = await BasisTheoryThreeDSNative.startAuthentication(
          session.id
        );
        Toast.show({
          type: result.status === 'successful' ? 'success' : 'info',
          text1: `Native 3DS: ${result.status}`,
          text2: result.details,
        });
        return;
      }

      // The legacy WebView path remains unchanged: JavaScript authenticates the
      // session first and explicitly starts the browser challenge when needed.
      const authentication = await authenticateSession(session.id);

      if (authentication.authentication_status_code !== 'C') {
        Toast.show({
          type: 'success',
          text1: 'Session Authenticated',
          text2: `Authentication Status: ${authentication.authentication_status_code}`,
        });
        return;
      }

      await startChallenge({
        sessionId: session.id,
        acsChallengeUrl: authentication.acs_challenge_url,
        acsTransactionId: authentication.acs_transaction_id,
        threeDSVersion: authentication.threeds_version,
        windowSize: '04',
      });
      Toast.show({
        type: 'success',
        text1: 'Challenge Complete',
      });
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: '3DS failed',
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        {isBusy && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}

        <View style={styles.identityCard} testID="architecture-identity">
          <Text style={styles.identityTitle}>Bridge POC</Text>
          <Text>Platform: {Platform.OS}</Text>
          <Text testID="active-renderer">
            Active renderer: {useNativeThreeDS ? 'Bridge' : 'WebView'}
          </Text>
          <Text>React Native: 0.74.5</Text>
        </View>

        <Text style={styles.rendererLabel}>Choose renderer</Text>
        <View style={styles.rendererSelector}>
          <RendererOption
            label="WebView"
            selected={renderer === 'webview'}
            disabled={isBusy}
            onPress={() => setRenderer('webview')}
          />
          <RendererOption
            label="Bridge"
            selected={renderer === 'bridge'}
            disabled={isBusy || !nativePlatform}
            onPress={() => setRenderer('bridge')}
          />
        </View>

        <CardPicker setCardNumber={setCardNumber} />
        <CardInput cardNumber={cardNumber} setCardNumber={setCardNumber} />
        {useNativeThreeDS && (
          <Text
            accessibilityLabel="Native 3DS status"
            testID="native-three-ds-status"
            style={styles.nativeStatus}
          >
            {nativeThreeDSStatusText[nativeStatus]}
          </Text>
        )}
        <Button
          title="Checkout"
          testID="checkout-button"
          disabled={useNativeThreeDS && nativeStatus !== 'ready'}
          onPress={() => void checkout()}
        />
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
};

type RendererOptionProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

// Pressable keeps the comparison control portable across iOS and Android. A
// production SDK would expose renderer selection as configuration rather than
// placing this POC-only switch in merchant UI.
const RendererOption: React.FC<RendererOptionProps> = ({
  label,
  selected,
  disabled,
  onPress,
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected, disabled }}
    disabled={disabled}
    onPress={onPress}
    testID={`renderer-${label.toLowerCase()}`}
    style={[
      styles.rendererOption,
      selected && styles.rendererOptionSelected,
      disabled && styles.rendererOptionDisabled,
    ]}
  >
    <Text
      style={[
        styles.rendererOptionText,
        selected && styles.rendererOptionTextSelected,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  identityCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginBottom: 20,
    padding: 12,
  },
  identityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rendererLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  rendererSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  rendererOption: {
    alignItems: 'center',
    borderColor: '#94a3b8',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  rendererOptionDisabled: {
    opacity: 0.45,
  },
  rendererOptionSelected: {
    backgroundColor: '#92400e',
    borderColor: '#92400e',
  },
  rendererOptionText: {
    color: '#334155',
    fontWeight: '600',
  },
  rendererOptionTextSelected: {
    color: '#ffffff',
  },
  nativeStatus: {
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default App;
