const { getDefaultConfig } = require('expo/metro-config');

// getDefaultConfig reads tsconfig.json paths (including the @/* alias)
// and wires them into Metro's resolver — required for Vercel builds.
module.exports = getDefaultConfig(__dirname);
