#!/bin/bash
set -e

# Copies the Basis Theory native 3DS SDK sources into this package so apps
# compile them as part of this library, with no extra registry, token, or
# git checkout at build time. Ravelin's binary SDK is not vendored; it is
# still resolved from Ravelin's official distribution at build time.
#
# To upgrade, change the tags and commit SHAs below, run this script, and
# commit the result.

IOS_THREEDS_TAG="1.2.1"
IOS_THREEDS_SHA="103d453aaa3960e561ed41e79f5a349bb8c451c9"
ANDROID_THREEDS_TAG="1.2.1"
ANDROID_THREEDS_SHA="e0f49fa444a18a642a69eea33574eeae7e2a9f14"

root_directory="$(cd "$(dirname "$0")/.." && pwd)"
work_directory="$(mktemp -d)"
trap 'rm -rf "$work_directory"' EXIT

fetch() {
  local repo="$1" sha="$2" destination="$3"
  mkdir -p "$destination"
  curl -fsSL "https://codeload.github.com/Basis-Theory/$repo/tar.gz/$sha" |
    tar -xz -C "$destination" --strip-components 1
}

fetch ios-threeds "$IOS_THREEDS_SHA" "$work_directory/ios-threeds"
fetch android-threeds "$ANDROID_THREEDS_SHA" "$work_directory/android-threeds"

ios_target="$root_directory/ios/ThreeDS"
rm -rf "$ios_target"
mkdir -p "$ios_target"
cp "$work_directory"/ios-threeds/ThreeDS/Sources/ThreeDS/*.swift "$ios_target/"

android_target="$root_directory/android/src/main/java/com/basistheory/threeds"
rm -rf "$android_target"
mkdir -p "$android_target"
cp -R "$work_directory"/android-threeds/lib/src/main/java/com/basistheory/threeds/. "$android_target/"

# android-threeds only applies its R8 rules to its own build, so ship them as
# this library's consumer rules; apps that minify would otherwise strip
# Ravelin and the crypto providers it loads by reflection.
{
  echo "# Vendored from android-threeds $ANDROID_THREEDS_TAG (commit $ANDROID_THREEDS_SHA) lib/proguard-rules.pro."
  echo "# Do not edit; regenerate with scripts/vendor-threeds.sh."
  cat "$work_directory/android-threeds/lib/proguard-rules.pro"
  echo
  echo "# Added by react-native-threeds. Ravelin's SDK references @Parcelize, a"
  echo "# compile-time annotation it doesn't ship, which fails R8 in minified apps."
  echo "-dontwarn kotlinx.parcelize.Parcelize"
} > "$root_directory/android/consumer-rules.pro"

cat > "$root_directory/ios/ThreeDS/VENDORED.md" <<EOF
Vendored from https://github.com/Basis-Theory/ios-threeds
tag $IOS_THREEDS_TAG, commit $IOS_THREEDS_SHA (Apache-2.0).
Do not edit these files; regenerate them with scripts/vendor-threeds.sh.
EOF

cat > "$android_target/VENDORED.md" <<EOF
Vendored from https://github.com/Basis-Theory/android-threeds
tag $ANDROID_THREEDS_TAG, commit $ANDROID_THREEDS_SHA (Apache-2.0).
Do not edit these files; regenerate them with scripts/vendor-threeds.sh.
EOF

echo "Vendored ios-threeds $IOS_THREEDS_TAG and android-threeds $ANDROID_THREEDS_TAG."

# Ravelin is resolved at build time, so its pinned versions must match the
# ones the vendored SDKs were built against.
ios_ravelin_url="$(grep -oE 'https://[^"]+\.zip' "$work_directory/ios-threeds/ThreeDS/Package.swift" | head -1)"
android_ravelin="$(grep -oE 'threeds2service-sdk:[0-9.]+' "$work_directory/android-threeds/lib/build.gradle" | head -1)"
mismatch=0
if ! grep -qF "$ios_ravelin_url" "$root_directory/BasisTheoryReactNativeThreeDS.podspec"; then
  echo "Update ravelin_url (and ravelin_sha256) in BasisTheoryReactNativeThreeDS.podspec to: $ios_ravelin_url"
  mismatch=1
fi
if ! grep -qF "$android_ravelin" "$root_directory/android/build.gradle"; then
  echo "Update the Ravelin dependency in android/build.gradle to: com.ravelin.threeds2service:$android_ravelin"
  mismatch=1
fi
exit $mismatch
