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
  BasisTheoryThreeDSTurbo,
  BasisTheory3dsProvider,
  isThreeDSTurboModuleAvailable,
  useBasisTheory3ds,
} from '@basis-theory/react-native-threeds';
import type { ThreeDSSession } from '@basis-theory/react-native-threeds';
import Toast from 'react-native-toast-message';
import { CardPicker } from './components/CardPicker';
import { CardInput } from './components/CardInput';
import { authenticateSession, tokenize } from './services/api';

type TurboModuleStatus = 'initializing' | 'ready' | 'unavailable' | 'failed';

type Renderer = 'webview' | 'turbo-module';

const turboModuleStatusText: Record<TurboModuleStatus, string> = {
  initializing: 'Initializing 3DS TurboModule',
  ready: '3DS TurboModule ready',
  unavailable: '3DS TurboModule unavailable',
  failed: '3DS TurboModule initialization failed',
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
    nativePlatform && process.env.USE_TURBO_3DS === 'true'
      ? 'turbo-module'
      : 'webview';

  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const [renderer, setRenderer] = React.useState<Renderer>(initialRenderer);
  const [cardNumber, setCardNumber] =
    React.useState<string>('4200000000000002');
  const [turboModuleStatus, setTurboModuleStatus] =
    React.useState<TurboModuleStatus>('initializing');
  const useTurboModule = renderer === 'turbo-module';

  React.useEffect(() => {
    if (!useTurboModule) {
      return;
    }

    setTurboModuleStatus('initializing');
    if (!isThreeDSTurboModuleAvailable()) {
      setTurboModuleStatus('unavailable');
      Toast.show({
        type: 'error',
        text1: '3DS TurboModule is unavailable',
      });
      return;
    }

    // Only public mobile configuration crosses Codegen. The private key stays
    // in the local merchant backend configured by AUTHENTICATION_ENDPOINT.
    void BasisTheoryThreeDSTurbo.configure({
      apiKey: process.env.PUBLIC_API_KEY ?? '',
      authenticationEndpoint: process.env.AUTHENTICATION_ENDPOINT ?? '',
      apiBaseUrl: process.env.API_BASE_URL,
      sandbox: process.env.API_BASE_URL?.includes('flock-dev') ?? false,
    })
      .then(() => setTurboModuleStatus('ready'))
      .catch((error) => {
        setTurboModuleStatus('failed');
        console.error(error);
      });
  }, [useTurboModule]);

  const checkout = async () => {
    try {
      setIsBusy(true);
      const token = await tokenize(cardNumber);

      if (!token) {
        throw new Error('Unable to create a token.');
      }

      // Tokenization happens before selecting a renderer, so neither the native
      // bridge nor the existing WebView session API receives a raw PAN here.
      const session: ThreeDSSession = useTurboModule
        ? await BasisTheoryThreeDSTurbo.createSession({ tokenId: token.id })
        : await createSession({ tokenId: token.id });

      if (useTurboModule) {
        // The platform SDK owns merchant authentication and any native challenge.
        // JavaScript receives the same final result on iOS and Android.
        const result = await BasisTheoryThreeDSTurbo.startAuthentication(
          session.id
        );
        Toast.show({
          type: result.status === 'successful' ? 'success' : 'info',
          text1: `TurboModule 3DS: ${result.status}`,
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
          <Text style={styles.identityTitle}>TurboModules POC</Text>
          <Text>Platform: {Platform.OS}</Text>
          <Text testID="active-renderer">
            Active renderer: {useTurboModule ? 'TurboModule' : 'WebView'}
          </Text>
          <Text>React Native: 0.86.3</Text>
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
            label="TurboModule"
            selected={renderer === 'turbo-module'}
            disabled={isBusy || !nativePlatform}
            onPress={() => setRenderer('turbo-module')}
          />
        </View>

        <CardPicker setCardNumber={setCardNumber} />
        <CardInput cardNumber={cardNumber} setCardNumber={setCardNumber} />
        {useTurboModule && (
          <Text
            accessibilityLabel="3DS TurboModule status"
            testID="turbo-module-status"
            style={styles.nativeStatus}
          >
            {turboModuleStatusText[turboModuleStatus]}
          </Text>
        )}
        <Button
          title="Checkout"
          testID="checkout-button"
          disabled={useTurboModule && turboModuleStatus !== 'ready'}
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
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#334155',
    borderColor: '#334155',
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
