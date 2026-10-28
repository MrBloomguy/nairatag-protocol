// Circle Web SDK uses Firebase Auth only for Apple social login.
// This app uses Circle email OTP, so provide a lightweight stub.

export class OAuthProvider {
  constructor(providerId) {
    this.providerId = providerId;
  }
  static credentialFromResult(result) {
    return null;
  }
}

export function getAuth(app) {
  return { app };
}

export async function signInWithPopup(auth, provider) {
  throw new Error('Apple social login is not configured in this app.');
}

export async function getRedirectResult(auth) {
  return null;
}

export default {
  OAuthProvider,
  getAuth,
  signInWithPopup,
  getRedirectResult,
};
