const tokenize = async (cardNumber: string) => {
  const tokenBody = {
    type: 'card',
    data: {
      // The Token API rejects separators such as spaces.
      number: cardNumber.replace(/\D/g, ''),
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
    if (!response.ok) {
      throw new Error(
        `Tokenization failed (${response.status}): ${JSON.stringify(token.errors ?? token.detail)}`
      );
    }
    return token;
  } catch (e) {
    console.error(e);
  }
};

export {tokenize};
