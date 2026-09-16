#!/bin/sh

set -eu

# This script prepares source-only dependencies for the POC without changing or
# publishing ios-threeds or android-threeds. Generated checkouts stay ignored.
script_directory="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
poc_support_directory="$(dirname -- "$script_directory")"
dependencies_directory="$poc_support_directory/.native-sdks"
ios_directory="$dependencies_directory/ios-threeds"
android_bridge_directory="$dependencies_directory/android-threeds-bridge"
android_turbo_modules_directory="$dependencies_directory/android-threeds-turbo-modules"
android_turbo_modules_rn081_directory="$dependencies_directory/android-threeds-turbo-modules-rn081"
android_sdk_directory="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"

if [ ! -d "$android_sdk_directory" ]; then
  echo "Android SDK not found. Set ANDROID_HOME or install it at $HOME/Library/Android/sdk." >&2
  exit 1
fi

mkdir -p "$dependencies_directory"

clone_tag() {
  repository_url="$1"
  tag="$2"
  destination="$3"

  if [ -d "$destination/.git" ]; then
    echo "Using existing checkout: $destination"
    return
  fi

  if [ -e "$destination" ]; then
    echo "Refusing to overwrite non-Git path: $destination" >&2
    exit 1
  fi

  git clone --depth 1 --branch "$tag" "$repository_url" "$destination"
}

clone_tag \
  "https://github.com/Basis-Theory/ios-threeds.git" \
  "1.2.1" \
  "$ios_directory"

clone_tag \
  "https://github.com/Basis-Theory/android-threeds.git" \
  "1.2.1" \
  "$android_bridge_directory"

clone_tag \
  "https://github.com/Basis-Theory/android-threeds.git" \
  "1.2.1" \
  "$android_turbo_modules_directory"

clone_tag \
  "https://github.com/Basis-Theory/android-threeds.git" \
  "1.2.1" \
  "$android_turbo_modules_rn081_directory"

# Gradle composite builds require one Android Gradle Plugin version. Each
# ignored SDK checkout receives the catalog matching its RN host. SDK source
# stays identical at tag 1.2.1 and neither upstream repository is modified.
cp "$poc_support_directory/android/bridge-libs.versions.toml" \
  "$android_bridge_directory/gradle/libs.versions.toml"
cp "$poc_support_directory/android/turbo-modules-libs.versions.toml" \
  "$android_turbo_modules_directory/gradle/libs.versions.toml"
cp "$poc_support_directory/android/bridge-libs.versions.toml" \
  "$android_turbo_modules_rn081_directory/gradle/libs.versions.toml"
cp "$poc_support_directory/android/settings.gradle" \
  "$android_bridge_directory/settings.gradle"
cp "$poc_support_directory/android/settings.gradle" \
  "$android_turbo_modules_directory/settings.gradle"
cp "$poc_support_directory/android/settings.gradle" \
  "$android_turbo_modules_rn081_directory/settings.gradle"

# A composite build resolves Android plugins in the SDK checkout too. Android
# Studio does not reliably inherit ANDROID_HOME for nested builds, so keep the
# machine-specific SDK path in ignored local properties for every checkout.
printf 'sdk.dir=%s\n' "$android_sdk_directory" \
  > "$android_bridge_directory/local.properties"
printf 'sdk.dir=%s\n' "$android_sdk_directory" \
  > "$android_turbo_modules_directory/local.properties"
printf 'sdk.dir=%s\n' "$android_sdk_directory" \
  > "$android_turbo_modules_rn081_directory/local.properties"

# CocoaPods needs a podspec next to the iOS SDK sources. The official SDK stays
# unchanged; this local-only packaging shim is owned by the React Native POC.
cp "$poc_support_directory/ios/ThreeDS.local.podspec" \
  "$ios_directory/ThreeDS.podspec"

ravelin_directory="$ios_directory/Vendor/Ravelin3DS.xcframework"
if [ ! -d "$ravelin_directory" ]; then
  temporary_directory="$(mktemp -d)"
  trap 'rm -rf "$temporary_directory"' EXIT HUP INT TERM
  archive="$temporary_directory/Ravelin3DS.xcframework.zip"

  curl --fail --location \
    "https://ravelin.mycloudrepo.io/public/repositories/threeds2service-ios/release/2.0.0/Ravelin3DS.xcframework.zip" \
    --output "$archive"
  echo "6e2c68757ca1c6476156c6c069cfcc04998b017343034b4d30b58e660d62fc83  $archive" \
    | shasum --algorithm 256 --check
  mkdir -p "$ios_directory/Vendor"
  unzip -q "$archive" -d "$ios_directory/Vendor"
fi

echo "Native POC dependencies are ready in $dependencies_directory"
