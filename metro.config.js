const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Belt-and-suspenders: Metro's native alias resolver (Metro >= 0.80 / RN 0.81)
// handles @/ in case the Babel plugin alone isn't sufficient in the build env.
config.resolver.alias = {
  '@': path.resolve(__dirname),
};

module.exports = config;
