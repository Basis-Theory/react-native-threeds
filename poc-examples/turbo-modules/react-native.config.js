const path = require('path');

// The example consumes the package at the workspace root rather than through
// node_modules. This explicit root lets React Native autolinking discover the
// POC podspec. Published consumers will not need this local-worktree override.
module.exports = {
  dependencies: {
    '@basis-theory/react-native-threeds': {
      root: path.resolve(__dirname, '../..'),
      platforms: {
        android: {
          sourceDir: path.resolve(__dirname, '../../android'),
          packageImportPath:
            'import com.basistheory.reactnativethreeds.BasisTheoryThreeDSTurboPackage;',
          packageInstance: 'new BasisTheoryThreeDSTurboPackage()',
        },
      },
    },
  },
};
