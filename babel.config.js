const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        // Absolute path lets the plugin correctly compute relative paths
        // from each source file (e.g. app/(app)/_layout.tsx → ../../lib/supabase)
        alias: { '@': path.resolve(__dirname) },
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
      }],
    ],
  };
};
