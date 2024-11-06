import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Button,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  BasisTheory3dsProvider,
  useBasisTheory3ds,
} from '@basis-theory/3ds-react-native';
import type {ThreeDSSession} from '@basis-theory/3ds-react-native';
import Toast from 'react-native-toast-message';
import {CardPicker} from './components/CardPicker';
import {CardInput} from './components/CardInput';
import {authenticateSession, tokenize} from './services/api';

const App: React.FC = () => {
  const apiBaseUrl = process.env.API_BASE_URL;
  const scriptSrc = process.env.SCRIPT_SRC;
  const apiKey = process.env.PUBLIC_API_KEY ?? '';

  return (
    <BasisTheory3dsProvider
      apiBaseUrl={apiBaseUrl}
      scriptSrc={scriptSrc}
      apiKey={apiKey}>
      <MainScreen />
    </BasisTheory3dsProvider>
  );
};

const MainScreen: React.FC = () => {
  const {createSession, startChallenge} = useBasisTheory3ds();

  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const [cardNumber, setCardNumber] = React.useState<string>('');

  const checkout = () => {
    setIsBusy(true);

    // Create a Card Token
    tokenize(cardNumber)
      .then(token => {
        if (token) {
          Toast.show({
            type: 'success',
            text1: 'Token Created',
            text2: 'Creating 3DS Session...',
          });

          // Create a 3DS Session
          createSession({ tokenId: token.id })
            .then((session: ThreeDSSession) => {
              Toast.show({
                type: 'success',
                text1: `3DS Session ${session.id} Created`,
                text2: 'Authenticating...',
              });

              // Authenticate the 3DS Session
              authenticateSession(session.id)
                .then(authentication => {
                  Toast.show({
                    type: 'success',
                    text1: 'Session Authenticated',
                    text2: `Authentication Status: ${authentication.authentication_status_code}`,
                  });

                  setIsBusy(false);

                  // Perform a Challenge if Necessary
                  if (authentication.authentication_status_code === 'C') {
                    Toast.show({
                      type: 'info',
                      text1: 'Challenge Required',
                      text2: 'Starting Challenge...',
                    });

                    const challenge = {
                      sessionId: session.id,
                      acsChallengeUrl: authentication.acs_challenge_url,
                      acsTransactionId: authentication.acs_transaction_id,
                      threeDSVersion: authentication.threeds_version,
                      windowSize: '04',
                    };

                    startChallenge(challenge).then(result => {
                      if (result) {
                        Toast.show({
                          type: 'success',
                          text1: 'Challenge Complete',
                        });
                      } else {
                        Toast.show({
                          type: 'error',
                          text1: 'Challenge Failed. Try Again.',
                        });
                      }
                    }).catch((e : any) => {
                      console.error(e);
                    });
                  }
                })
                .catch((e: any) => console.error(e));
            })
            .catch((e: any) => console.error(e));
        }
      })
      .catch(e => console.error(e));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}>
        {isBusy && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}

        <CardPicker setCardNumber={setCardNumber} />
        <CardInput cardNumber={cardNumber} setCardNumber={setCardNumber} />
        <Button title="Checkout" onPress={checkout} />
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
};

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
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000, // Higher than WebView to ensure visibility
  },
});

export default App;
