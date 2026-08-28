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

// Force a SINGLE copy of React for the whole bundle. This app needs React 19
// (Expo SDK 54), but the web apps pin React 18 at the repo-root node_modules,
// right next to the hoisted react-native — so without this, react-native pulls
// React 18 while the app uses React 19, giving two Reacts and a runtime crash
// ("Cannot read property 'default'/'S' of undefined", stopSurface failed).
const reactDir = path.resolve(projectRoot, 'node_modules/react');
const forcedReact = {
  react: path.join(reactDir, 'index.js'),
  'react/jsx-runtime': path.join(reactDir, 'jsx-runtime.js'),
  'react/jsx-dev-runtime': path.join(reactDir, 'jsx-dev-runtime.js'),
};
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const forced = forcedReact[moduleName];
  if (forced) {
    return { type: 'sourceFile', filePath: forced };
  }
  return (upstreamResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
