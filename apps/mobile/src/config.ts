// Base URL of the API gateway.
//
// A physical phone can't reach your dev machine's `localhost`, so this defaults
// to the deployed gateway. To test against a local gateway (`npm run
// dev:gateway`), replace this with your computer's LAN IP, e.g.
//   export const GATEWAY_URL = 'http://192.168.1.5:8000';
export const GATEWAY_URL = 'https://event-api.porulontech.com';
