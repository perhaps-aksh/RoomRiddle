const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * RoomRiddle: the TV app bundles the shared, pure-TypeScript workspace packages
 * (game engine, mystery data, types) straight from ../../packages. apps/tv stays
 * outside the npm workspaces, so the packages are mapped here instead of being
 * installed as dependencies.
 *
 * @type {import('metro-config').MetroConfig}
 */
const packagesDir = path.resolve(__dirname, '../../packages');
const sharedPackage = name => path.join(packagesDir, name);

const config = {
  watchFolders: [packagesDir],
  resolver: {
    extraNodeModules: {
      '@roomriddle/shared-types': sharedPackage('shared-types'),
      '@roomriddle/game-engine': sharedPackage('game-engine'),
      '@roomriddle/mystery-data': sharedPackage('mystery-data'),
      '@roomriddle/client': sharedPackage('client'),
      '@roomriddle/ui': sharedPackage('ui'),
    },
    // Shared packages have no node_modules of their own: resolve everything from the TV app.
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
