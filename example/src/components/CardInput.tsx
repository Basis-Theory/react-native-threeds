import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface Props {
  cardNumber: string;
  setCardNumber: (number: string) => void;
}

export const CardInput: React.FC<Props> = ({ cardNumber, setCardNumber }) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        accessibilityLabel="Card number"
        testID="card-number-input"
        style={styles.input}
        placeholder="Enter Card Number"
        keyboardType="numeric"
        maxLength={19}
        value={cardNumber}
        // Reformatting on every keystroke moves the cursor while Maestro types,
        // which scrambles the digits, so the value is kept exactly as typed.
        onChangeText={setCardNumber}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 5,
  },
  input: {
    height: 50,
    borderColor: '#888',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
  },
});
