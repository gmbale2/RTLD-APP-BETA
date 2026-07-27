const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// pnpm stores packages in node_modules/.pnpm/<name@ver>/node_modules/<name>/...
// Without symlink resolution, Metro sees raw .pnpm paths which don't match the
// default transformIgnorePatterns, so Babel never runs on those files and private
// class fields (#x, #y, etc.) survive into hermesc which doesn't support them.
// Enabling symlinks makes Metro resolve to the canonical node_modules/<pkg> paths,
// which do match the transform patterns.
config.resolver = config.resolver ?? {};
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
