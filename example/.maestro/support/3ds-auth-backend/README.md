# Local 3DS authentication backend

This non-production Express service models the merchant-owned backend required
by the native and WebView examples. It accepts a 3DS session ID on
`POST /3ds/authenticate`, supplies the merchant/payment details used by the
POC, and calls Basis Theory with `BT_API_KEY_PVT`.

```sh
cp .env.example .env
yarn install
yarn start
```

The service listens on port `3333`. Keep the private key only in this ignored
`.env`; mobile examples must use their public application key.
