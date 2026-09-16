# POC support files

This directory contains development-only support for the ENG-12518 examples:

- `backend` is the local merchant endpoint that owns `BT_API_KEY_PVT` and calls
  the Basis Theory 3DS authentication API.
- `ios/ThreeDS.local.podspec` packages the checked-out iOS SDK for local
  CocoaPods consumption without changing or publishing `ios-threeds`.
- `scripts/setup-native-dependencies.sh` prepares ignored iOS and Android SDK
  v1.2.1 source checkouts.
- `scripts/open-android-studio.sh` opens either Android host with Node available
  and an isolated Gradle daemon home.

Generated SDK checkouts, Gradle state, dependency folders, and all `.env` files
are ignored. See `docs/LOCAL-RUNBOOK.md` for the complete startup sequence.
