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
  BasisTheoryThreeDSStrategies,
  isNativeThreeDSAvailable,
  isThreeDSTurboModuleAvailable,
} from '@basis-theory/react-native-threeds';
import type { ThreeDSSession } from '@basis-theory/react-native-threeds';
import Toast from 'react-native-toast-message';
import { CardPicker } from './components/CardPicker';
import { CardInput } from './components/CardInput';
import { tokenize } from './services/api';

type NativeThreeDSStatus = 'initializing' | 'ready' | 'unavailable' | 'failed';

// This app never writes iOS/Android code of its own. Every strategy below
// comes straight from the published package — this file is what a customer
// would actually author after `yarn add @basis-theory/react-native-threeds`.
type Strategy = 'bridge' | 'turboModule';

const nativeThreeDSStatusText: Record<NativeThreeDSStatus, string> = {
  initializing: 'Initializing native 3DS',
  ready: 'Native 3DS ready',
  unavailable: 'Native 3DS unavailable',
  failed: 'Native 3DS initialization failed',
};

const platformKey = Platform.OS === 'android' ? 'android' : 'ios';

// android.turboModule is included for completeness. Selecting it throws with
// an actionable message today — see docs/ANDROID-TURBOMODULE-INVESTIGATION.md
// at the repository root for why.
const strategyModule = (strategy: Strategy) =>
  BasisTheoryThreeDSStrategies[platformKey][strategy];

const isStrategyAvailable = (strategy: Strategy): boolean =>
  strategy === 'bridge'
    ? isNativeThreeDSAvailable
    : isThreeDSTurboModuleAvailable();

const App: React.FC = () => <MainScreen />;

const MainScreen: React.FC = () => {
  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const [strategy, setStrategy] = React.useState<Strategy>('bridge');
  const [cardNumber, setCardNumber] =
    React.useState<string>('4200000000000002');
  const [nativeStatus, setNativeStatus] =
    React.useState<NativeThreeDSStatus>('initializing');

  React.useEffect(() => {
    setNativeStatus('initializing');

    if (!isStrategyAvailable(strategy)) {
      setNativeStatus('unavailable');
      return;
    }

    // Only public mobile configuration crosses the bridge or TurboModule. The
    // private key stays in the local backend configured by
    // AUTHENTICATION_ENDPOINT.
    void strategyModule(strategy)
      .configure({
        apiKey: process.env.PUBLIC_API_KEY ?? '',
        authenticationEndpoint: process.env.AUTHENTICATION_ENDPOINT ?? '',
        apiBaseUrl: process.env.API_BASE_URL,
        sandbox: process.env.API_BASE_URL?.includes('flock-dev') ?? false,
      })
      .then(() => setNativeStatus('ready'))
      .catch((error) => {
        setNativeStatus('failed');
        console.error(error);
        Toast.show({
          type: 'error',
          text1: `${strategy} unavailable`,
          text2: error instanceof Error ? error.message : 'Unknown error',
        });
      });
  }, [strategy]);

  const checkout = async () => {
    try {
      setIsBusy(true);
      const token = await tokenize(cardNumber);

      if (!token) {
        throw new Error('Unable to create a token.');
      }

      const threeDS = strategyModule(strategy);
      const session: ThreeDSSession = await threeDS.createSession({
        tokenId: token.id,
      });
      const result = await threeDS.startAuthentication(session.id);

      Toast.show({
        type: result.status === 'successful' ? 'success' : 'info',
        text1: `${strategy}: ${result.status}`,
        text2: result.details,
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
          <Text style={styles.identityTitle}>Unified consumer example</Text>
          <Text>Platform: {Platform.OS}</Text>
          <Text testID="active-strategy">Active strategy: {strategy}</Text>
        </View>

        <Text style={styles.rendererLabel}>Choose integration</Text>
        <View style={styles.rendererSelector}>
          <StrategyOption
            label="Bridge"
            selected={strategy === 'bridge'}
            disabled={isBusy}
            onPress={() => setStrategy('bridge')}
          />
          <StrategyOption
            label="TurboModule"
            selected={strategy === 'turboModule'}
            disabled={isBusy}
            onPress={() => setStrategy('turboModule')}
          />
        </View>

        <CardPicker setCardNumber={setCardNumber} />
        <CardInput cardNumber={cardNumber} setCardNumber={setCardNumber} />
        <Text
          accessibilityLabel="Native 3DS status"
          testID="native-three-ds-status"
          style={styles.nativeStatus}
        >
          {nativeThreeDSStatusText[nativeStatus]}
        </Text>
        <Button
          title="Checkout"
          testID="checkout-button"
          disabled={nativeStatus !== 'ready'}
          onPress={() => void checkout()}
        />
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
};

type StrategyOptionProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

const StrategyOption: React.FC<StrategyOptionProps> = ({
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
    testID={`strategy-${label.toLowerCase()}`}
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
    backgroundColor: '#dbeafe',
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
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
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
