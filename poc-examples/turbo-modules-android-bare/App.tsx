import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BasisTheoryThreeDSTurbo,
  isThreeDSTurboModuleAvailable,
} from '@basis-theory/react-native-threeds';

const defaultCardNumber = '4200000000000002';

const App = (): React.JSX.Element => {
  const [cardNumber, setCardNumber] = React.useState(defaultCardNumber);
  const [isReady, setIsReady] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);
  const [status, setStatus] = React.useState('Checking the TurboModule runtime');

  React.useEffect(() => {
    const configureTurboModule = async () => {
      // A bridgeless host can finish exposing JSI bindings just after the first
      // JS frame. Retry briefly so this POC distinguishes that startup race
      // from a host that never publishes the Codegen TurboModule proxy.
      let turboModuleAvailable = isThreeDSTurboModuleAvailable();
      for (let attempt = 0; !turboModuleAvailable && attempt < 8; attempt += 1) {
        await new Promise<void>(resolve => setTimeout(resolve, 250));
        turboModuleAvailable = isThreeDSTurboModuleAvailable();
      }

      if (!turboModuleAvailable) {
        setStatus('TurboModule is unavailable in this native host.');
        return;
      }

      try {
        await BasisTheoryThreeDSTurbo.configure({
          apiKey: process.env.PUBLIC_API_KEY ?? '',
          authenticationEndpoint: process.env.AUTHENTICATION_ENDPOINT ?? '',
          apiBaseUrl: process.env.API_BASE_URL,
          sandbox: process.env.API_BASE_URL?.includes('flock-dev') ?? false,
        });
        setIsReady(true);
        setStatus('TurboModule ready in the bare React Native Android host.');
      } catch (error) {
        console.error(error);
        setStatus(`TurboModule configuration failed: ${String(error)}`);
      }
    };

    void configureTurboModule();
  }, []);

  const authenticate = async () => {
    if (!isReady) {
      Alert.alert('TurboModule unavailable', status);
      return;
    }

    try {
      setIsBusy(true);
      setStatus('Tokenizing the test card.');
      // The app sends a PAN only to the public tokenization API. The resulting
      // token, rather than card data, is the only payment value passed to 3DS.
      const tokenResponse = await fetch(`${process.env.API_BASE_URL}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'BT-API-KEY': process.env.PUBLIC_API_KEY ?? '',
        },
        body: JSON.stringify({
          type: 'card',
          data: {
            number: cardNumber,
            expiration_month: 12,
            expiration_year: 2030,
          },
        }),
      });
      const token = await tokenResponse.json();
      if (!tokenResponse.ok || !token.id) {
        throw new Error(token.message ?? 'Unable to tokenize the test card.');
      }

      setStatus('Creating the native 3DS session.');
      // These calls cross the Codegen contract into the Kotlin adapter. Keep
      // this sequence here to make future TurboModule API changes easy to see.
      const session = await BasisTheoryThreeDSTurbo.createSession({
        tokenId: token.id,
      });

      setStatus('Starting native 3DS authentication.');
      const result = await BasisTheoryThreeDSTurbo.startAuthentication(session.id);
      setStatus(`3DS ${result.status}: ${result.details}`);
    } catch (error) {
      console.error(error);
      setStatus(`Authentication failed: ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>3DS TurboModule Android POC</Text>
        <Text style={styles.description}>
          This target is a bare React Native host. It deliberately excludes Expo
          so it can validate the Codegen Android adapter independently.
        </Text>
        <Text style={styles.label}>Test card number</Text>
        <TextInput
          value={cardNumber}
          onChangeText={setCardNumber}
          keyboardType="number-pad"
          style={styles.input}
        />
        <View style={styles.button}>
          <Button
            title={isBusy ? 'Authenticating…' : 'Start native 3DS'}
            disabled={!isReady || isBusy}
            onPress={() => void authenticate()}
          />
        </View>
        {isBusy && <ActivityIndicator size="large" />}
        <Text style={styles.status}>{status}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#ffffff'},
  content: {flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16},
  title: {fontSize: 26, fontWeight: '700', color: '#111827'},
  description: {fontSize: 16, lineHeight: 24, color: '#374151'},
  label: {fontSize: 16, fontWeight: '600', color: '#111827'},
  input: {
    borderColor: '#9ca3af',
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 18,
    padding: 12,
  },
  button: {marginTop: 8},
  status: {fontSize: 14, lineHeight: 20, color: '#374151'},
});

export default App;
