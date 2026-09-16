const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const pkg = require('../../package.json');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const root = path.resolve(__dirname, '../..');
const appNodeModules = path.join(__dirname, 'node_modules');
const config = getDefaultConfig(__dirname);

// The SDK source is a sibling workspace. Keep React Native resolution pinned
// to this bare host so its Codegen contract and runtime always use RN 0.81.
config.watchFolders = [...config.watchFolders, root];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  appNodeModules,
  path.join(root, 'node_modules'),
];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === pkg.name) {
    return context.resolveRequest(context, path.join(root, pkg.source), platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
