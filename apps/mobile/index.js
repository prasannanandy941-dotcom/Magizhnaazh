import { registerRootComponent } from 'expo';
import App from './App';

// Explicit entry point. In this monorepo `expo` is hoisted to the repo-root
// node_modules, so the default `node_modules/expo/AppEntry.js` (which imports
// `../../App`) would resolve to the wrong App. Registering here keeps the
// entry unambiguous.
registerRootComponent(App);
