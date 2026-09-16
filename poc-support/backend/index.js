const express = require("express");
const path = require("path");
var cors = require("cors");
var bodyParser = require("body-parser");
const { BasisTheory } = require("@basis-theory/basis-theory-js");

// Yarn may launch this workspace from the repository root. Resolve the file
// from this source file so the private key is always read from this backend.
require("dotenv").config({ path: path.join(__dirname, ".env") });

// This process models the merchant-controlled server in the POC. It is kept
// outside the React Native app so the private API key never crosses the mobile
// or native bridge boundary.
var app = express();

const port = 3333;

app.use(bodyParser.json());
app.use(cors());

let bt;
(async () => {
  let apiKey = process.env.BT_API_KEY_PVT;


  if (!apiKey) {
    throw Error("Missing api key");
  }

  bt = await new BasisTheory().init(apiKey, {
    // The POC uses Basis Theory's internal development environment end-to-end.
    apiBaseUrl: "https://api.flock-dev.com",
  });
})();

// The iOS SDK posts only the 3DS session ID here. The backend enriches the
// request with merchant/payment context and authenticates it using a private key.
app.post("/3ds/authenticate", async (req, res) => {
  try {
    var payload = req.body;

    const response = await bt.threeds.authenticateSession(payload.sessionId, {
      authenticationCategory: "payment",
      authenticationType: "payment-transaction",
      purchaseInfo: {
        amount: "80000",
        currency: "826",
        exponent: "2",
        date: "20240109141010",
      },
      requestorInfo: {
        id: "example-3ds-merchant",
        name: "Example 3DS Merchant",
        url: "https://www.example.com/example-merchant",
      },
      merchantInfo: {
        mid: "9876543210001",
        acquirerBin: "000000999",
        name: "Example 3DS Merchant",
        categoryCode: "7922",
        countryCode: "826",
      },
      cardholderInfo: {
        name: "John Doe",
        email: "john@me.com",
      },
    });

    res.status(200).send({
      ...response,
      // include these to increase sucess rate during challenge evaluation
      merchantName: "Example 3DS Merchant",
      purchaseAmount: "80000",
      currency: "826",
    });
  } catch (e) {
    // SDK errors normally include HTTP metadata, but configuration/network
    // failures may not. Always return a valid response to the mobile client.
    const status = Number.isInteger(e?.status) ? e.status : 500;
    res.status(status).send(e?.data ?? { message: e?.message ?? "Authentication failed" });
  }
});

app.post("/3ds/get-result", async (req, res) => {
  try {
    var payload = req.body;

    const response = await bt.threeds.getChallengeResult(payload.sessionId);

    res.status(200).send({
      ...response,
    });
  } catch (e) {
    const status = Number.isInteger(e?.status) ? e.status : 500;
    res.status(status).send(e?.data ?? { message: e?.message ?? "Result lookup failed" });
  }
});

app.listen(port, () => {
  console.log(`This thing is running like Forest Gump on port: ${port}`);
});
