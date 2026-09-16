module.exports = function (api) {
  api.cache(true);

  // Expo transforms both the example and the linked TypeScript library. Metro
  // performs the local package alias, so Babel needs no path-based overrides.
  return {
    presets: ['babel-preset-expo'],
    plugins: ['module:react-native-dotenv'],
  };
};
