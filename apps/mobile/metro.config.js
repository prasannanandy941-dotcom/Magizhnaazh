// Monorepo-aware Metro config: this app lives in a workspace, so most deps are
// hoisted to the repo-root node_modules. Metro must watch the workspace root
// and resolve modules from both the app's and the root's node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// NOTE: leave hierarchical lookup ON. Some transitive deps (e.g. `color` ->
// `simple-swizzle` -> `is-arrayish`) end up nested in a package's own
// node_modules rather than hoisted to the root; disabling hierarchical lookup
// makes Metro miss those and fail to resolve them.

module.exports = config;
