const tokenize = async (cardNumber: string) => {
  const tokenBody = {
    type: 'card',
    data: {
      number: cardNumber,
      expiration_month: 12,
      expiration_year: 2030,
    },
  };

  try {
    const response = await fetch(`${process.env.API_BASE_URL}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'BT-API-KEY': `${process.env.PUBLIC_API_KEY}`,
      },
      body: JSON.stringify(tokenBody),
    });

    const token = await response.json();
    return token;
  } catch (e) {
    console.error(e);
  }
};

/*
  This function is used for demonstration purposes only, authenticating sessions should happen in your backend.
  DO NOT USE PRIVATE KEYS DIRECTLY IN YOUR FRONTEND
*/
const authenticateSession = async (sessionId: string) => {
  const authBody = {
    authentication_category: 'payment',
    authentication_type: 'payment-transaction',
    purchase_info: {
      amount: '80000',
      currency: '826',
      exponent: '2',
      date: '20240109141010',
    },
    requestor_info: {
      id: 'example-3ds-merchant',
      name: 'Example 3DS Merchant',
      url: 'https://www.basistheory.com/example-merchant',
    },
    merchant_info: {
      mid: '9876543210001',
      acquirer_bin: '000000999',
      name: 'Example 3DS Merchant',
      category_code: '7922',
      country_code: '826',
    },
    cardholder_info: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/3ds/sessions/${sessionId}/authenticate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'BT-API-KEY': `${process.env.PRIVATE_API_KEY}`,
        },
        body: JSON.stringify(authBody),
      },
    );

    const authentication = await response.json();
    return authentication;
  } catch (e) {
    console.error(e);
  }
};

export {tokenize, authenticateSession};
