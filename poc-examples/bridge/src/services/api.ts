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
  const endpoint = process.env.AUTHENTICATION_ENDPOINT;

  if (!endpoint) {
    throw new Error('AUTHENTICATION_ENDPOINT is required.');
  }

  // Both comparison paths call the merchant-owned backend. Only a session ID
  // leaves the app; merchant data and the private key remain server-side.
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionId}),
  });
  const authentication = await response.json();

  if (!response.ok) {
    throw new Error(
      authentication?.message ?? `Authentication failed (${response.status}).`,
    );
  }

  // The backend SDK returns camelCase while the existing WebView code expects
  // API-style snake_case names. Normalize at this boundary during the POC.
  return {
    ...authentication,
    authentication_status_code:
      authentication.authentication_status_code ??
      authentication.authenticationStatusCode ??
      (authentication.authenticationStatus === 'challenge'
        ? 'C'
        : authentication.authenticationStatus),
    acs_challenge_url:
      authentication.acs_challenge_url ?? authentication.acsChallengeUrl,
    acs_transaction_id:
      authentication.acs_transaction_id ?? authentication.acsTransactionId,
    threeds_version:
      authentication.threeds_version ??
      authentication.threedsVersion ??
      authentication.threeDSVersion,
  };
};

export {tokenize, authenticateSession};
