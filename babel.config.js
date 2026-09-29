module.exports = (api) => {
  // Jest sets BABEL_ENV/NODE_ENV=test automatically. react-native's own jest
  // mocks (e.g. jest/mockComponent.js) exercise react-native's real source
  // under node_modules, which uses Flow's newer `component` syntax — the bob
  // preset below doesn't transform that, only the official preset does. Pick
  // one preset set outright (rather than merging both, which makes two Flow
  // parser plugins collide) so the published build output stays unaffected.
  if (api.env('test')) {
    return {
      presets: ['module:@react-native/babel-preset'],
    };
  }

  return {
    presets: [
      ['module:react-native-builder-bob/babel-preset', {modules: 'commonjs'}],
    ],
  };
};
