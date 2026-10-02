const path = require('path');

// The example consumes the package at the workspace root rather than through
// node_modules. This explicit root lets React Native autolinking discover the
// library's podspec/build.gradle directly from the monorepo, so day-to-day
// changes to the library are picked up without a publish step. Published
// consumers will not need this override — autolinking finds the package in
// their own node_modules.
module.exports = {
  dependencies: {
    '@basis-theory/react-native-threeds': {
      root: path.resolve(__dirname, '..'),
    },
  },
};
