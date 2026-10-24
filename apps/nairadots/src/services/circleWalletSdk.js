// Keep Circle's optional-on-first-render SDK in its own async-loaded chunk.
// This lets the app shell render while the SDK chunk loads only for Circle sign-in.
export { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
