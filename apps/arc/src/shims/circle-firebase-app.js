// Circle Web SDK uses Firebase only for Apple social login.
// This app uses Circle email OTP, so keep Firebase out of the browser bundle.

export class FirebaseError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'FirebaseError';
    this.code = code;
  }
}

export function getApps() {
  return [];
}

export function initializeApp(config) {
  return { name: '[DEFAULT]', options: config || {} };
}

export default {
  FirebaseError,
  getApps,
  initializeApp,
};
