import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import testCards from '../data/test-cards.json';

interface Props {
  setCardNumber: (number: string) => void;
}

export const CardPicker: React.FC<Props> = ({ setCardNumber }) => {
  const [selectedCard, setSelectedCard] = React.useState<string>(
    testCards[0]?.cardNumber ?? '',
  );

  const selectCard = (cardNumber: string) => {
    setSelectedCard(cardNumber);
    setCardNumber(cardNumber);
  };

  return (
    <View>
      <Text style={styles.pickerLabel}>Select a Card:</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCard}
          onValueChange={selectCard}
          mode="dropdown"
        >
          {testCards.map((item, index) => (
            <Picker.Item
              key={index}
              label={item.title}
              value={item.cardNumber}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerLabel: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
});
