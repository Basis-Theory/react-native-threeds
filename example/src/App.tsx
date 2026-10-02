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
  Keyboard,
  TouchableWithoutFeedback,
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

// Android only exposes `bridge` in BasisTheoryThreeDSStrategies — there is no
// supported Android TurboModule integration to select.
const strategyModule = (strategy: Strategy) =>
  Platform.OS === 'android'
    ? BasisTheoryThreeDSStrategies.android.bridge
    : BasisTheoryThreeDSStrategies.ios[strategy];

const isStrategyAvailable = (strategy: Strategy): boolean =>
  strategy === 'bridge'
    ? isNativeThreeDSAvailable
    : isThreeDSTurboModuleAvailable();

// Start on the strategy BasisTheoryThreeDS would pick: the TurboModule on iOS
// builds with the new architecture, the Bridge everywhere else.
const initialStrategy: Strategy =
  Platform.OS === 'ios' && isStrategyAvailable('turboModule')
    ? 'turboModule'
    : 'bridge';

const App: React.FC = () => <MainScreen />;

const MainScreen: React.FC = () => {
  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const [strategy, setStrategy] = React.useState<Strategy>(initialStrategy);
  const [cardNumber, setCardNumber] =
    React.useState<string>('4000020000000000');
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

  const createSession = async (): Promise<ThreeDSSession> => {
    const token = await tokenize(cardNumber);

    if (!token) {
      throw new Error('Unable to create a token.');
    }

    return strategyModule(strategy).createSession({ tokenId: token.id });
  };

  // Creates a session and never authenticates it, like a user who leaves
  // checkout. The next checkout must still succeed.
  const abandonSession = async () => {
    try {
      setIsBusy(true);
      await createSession();
      Toast.show({ type: 'info', text1: 'Session abandoned' });
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

  const checkout = async () => {
    try {
      setIsBusy(true);
      const session = await createSession();
      const result = await strategyModule(strategy).startAuthentication(
        session.id
      );

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
      {/* The numeric keyboard has no dismiss key, so tapping outside the input
          closes it. accessible={false} keeps the children visible to
          assistive tech and to Maestro. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            <Text style={styles.identityTitle}>React Native 3DS Example</Text>
            <Text>Platform: {Platform.OS}</Text>
            <Text testID="active-strategy">Active strategy: {strategy}</Text>
          </View>

          <Text style={styles.strategyLabel}>Choose integration</Text>
          <View style={styles.strategySelector}>
            <StrategyOption
              label="Bridge"
              strategy="bridge"
              selected={strategy === 'bridge'}
              disabled={isBusy || !isStrategyAvailable('bridge')}
              onPress={() => setStrategy('bridge')}
            />
            {Platform.OS === 'ios' && (
              <StrategyOption
                label="TurboModule"
                strategy="turboModule"
                selected={strategy === 'turboModule'}
                disabled={isBusy || !isStrategyAvailable('turboModule')}
                onPress={() => setStrategy('turboModule')}
              />
            )}
          </View>

          <CardPicker setCardNumber={setCardNumber} />
          <CardInput cardNumber={cardNumber} setCardNumber={setCardNumber} />
          <Text
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
          <Button
            title="Abandon a session"
            testID="abandon-session-button"
            disabled={nativeStatus !== 'ready'}
            onPress={() => void abandonSession()}
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      <Toast />
    </SafeAreaView>
  );
};

type StrategyOptionProps = {
  label: string;
  strategy: Strategy;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

const StrategyOption: React.FC<StrategyOptionProps> = ({
  label,
  strategy,
  selected,
  disabled,
  onPress,
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected, disabled }}
    disabled={disabled}
    onPress={onPress}
    testID={`strategy-${strategy}`}
    style={[
      styles.strategyOption,
      selected && styles.strategyOptionSelected,
      disabled && styles.strategyOptionDisabled,
    ]}
  >
    <Text
      style={[
        styles.strategyOptionText,
        selected && styles.strategyOptionTextSelected,
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
  strategyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  strategySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  strategyOption: {
    alignItems: 'center',
    borderColor: '#94a3b8',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  strategyOptionDisabled: {
    opacity: 0.45,
  },
  strategyOptionSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  strategyOptionText: {
    color: '#334155',
    fontWeight: '600',
  },
  strategyOptionTextSelected: {
    color: '#ffffff',
  },
  nativeStatus: {
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default App;
