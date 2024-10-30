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
        style={styles.input}
        placeholder="Enter Card Number"
        keyboardType="numeric"
        maxLength={19}
        value={cardNumber}
        onChangeText={(text) => {
          // formatting the card number as "XXXX XXXX XXXX XXXX"
          const formatted = text
            .replace(/\D/g, '')
            .replace(/(.{4})/g, '$1 ')
            .trim();
          setCardNumber(formatted);
        }}
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
