const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = '@basis-theory/react-native-threeds';

// Autolinking evaluates this file from the app's project directory (or one of
// its native subdirectories), so walk up to the app's package.json.
const readAppPackageJson = () => {
  let directory = process.cwd();

  while (true) {
    const candidate = path.join(directory, 'package.json');
    if (fs.existsSync(candidate)) {
      const packageJson = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (packageJson.name !== PACKAGE_NAME) {
        return packageJson;
      }
    }

    const parent = path.dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
};

// Native 3DS is opt-in so WebView-only apps keep building exactly as before:
// no native code, no Ravelin SDK, and no extra platform requirements. Apps
// enable it with `"@basis-theory/react-native-threeds": { "native": true }`
// in their package.json.
const nativeEnabled = readAppPackageJson()?.[PACKAGE_NAME]?.native === true;

module.exports = {
  dependency: {
    platforms: nativeEnabled
      ? {
          android: {
            // Android only ships the Bridge; see "Choosing the native strategy"
            // in the README.
            packageImportPath:
              'import com.basistheory.reactnativethreeds.BasisTheoryThreeDSBridgePackage;',
            packageInstance: 'new BasisTheoryThreeDSBridgePackage()',
          },
          ios: {},
        }
      : {
          android: null,
          ios: null,
        },
  },
};
