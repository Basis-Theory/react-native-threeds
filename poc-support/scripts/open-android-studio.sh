#!/bin/sh

set -eu

# Android Studio started from Finder may not inherit Homebrew's Node path. This
# launcher also isolates Gradle daemon state so an older GUI-started daemon
# cannot keep a stale PATH and fail while evaluating React Native settings.
case "${1:-}" in
  bridge)
    application_directory="poc-examples/bridge/android"
    ;;
  turbo-modules|turbo)
    application_directory="poc-examples/turbo-modules/android"
    ;;
  turbo-modules-android-bare|turbo-bare)
    application_directory="poc-examples/turbo-modules-android-bare/android"
    ;;
  unified)
    application_directory="poc-examples/unified/android"
    ;;
  *)
    echo "Usage: $0 bridge|turbo-modules|turbo-modules-android-bare|unified" >&2
    exit 2
    ;;
esac

android_studio="/Applications/Android Studio.app/Contents/MacOS/studio"
if [ ! -x "$android_studio" ]; then
  echo "Android Studio was not found at $android_studio" >&2
  exit 1
fi

# The Expo and bare React Native hosts are compatible with Node 24. Prefer the
# local NVM version because the globally installed Node 26 is not a POC baseline.
nvm_node_executable="$HOME/.nvm/versions/node/v24.20.0/bin/node"
if [ -x "$nvm_node_executable" ]; then
  node_executable="$nvm_node_executable"
else
  node_executable="$(command -v node || true)"
fi
if [ -z "$node_executable" ]; then
  echo "Node is not available in this Terminal session." >&2
  exit 1
fi

script_directory="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
poc_support_directory="$(dirname -- "$script_directory")"
repository_directory="$(dirname -- "$poc_support_directory")"
node_directory="$(dirname -- "$node_executable")"

PATH="$node_directory:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
GRADLE_USER_HOME="$poc_support_directory/.gradle-user-home"
ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "Android SDK not found. Set ANDROID_HOME or install it at $HOME/Library/Android/sdk." >&2
  exit 1
fi
ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH GRADLE_USER_HOME ANDROID_HOME ANDROID_SDK_ROOT

# Java 21 can run both the Bridge app's Gradle 8.6 and the TurboModule app's
# Gradle 9.x. Android Studio may still ask for this selection on first import.
java_home_21="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
if [ -n "$java_home_21" ]; then
  JAVA_HOME="$java_home_21"
  export JAVA_HOME
fi

exec "$android_studio" "$repository_directory/$application_directory"
