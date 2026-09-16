const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const pkg = require('../../package.json');

const root = path.resolve(__dirname, '../..');
const appNodeModules = path.join(__dirname, 'node_modules');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// The example and library are sibling workspaces. Watch the library root and
// resolve its package name directly to TypeScript source for fast POC iteration.
config.watchFolders = [...config.watchFolders, root];

// The library root retains RN 0.74 for the Bridge POC, while this app uses
// RN 0.86. Disable parent-directory lookup so imports from linked library
// sources resolve React and React Native from this TurboModules app instead.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  appNodeModules,
  path.join(root, 'node_modules'),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === pkg.name) {
    return context.resolveRequest(
      context,
      path.join(root, pkg.source),
      platform,
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
