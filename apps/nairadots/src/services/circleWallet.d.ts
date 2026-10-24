export interface CircleLoginSession {
  userToken: string;
  encryptionKey: string;
}

export interface CircleWalletSession extends CircleLoginSession {
  walletAddress: string;
  walletId: string;
  authProvider: 'circle';
  blockchain: 'ARC-TESTNET';
  chainId: 5042002;
}

export function requestCircleEmailOtp(email: string): Promise<{ email: string }>;
export function verifyCircleEmailOtp(): Promise<CircleLoginSession>;
export function connectCircleWallet(
  login: CircleLoginSession,
  onStatusUpdate?: (status: { step: string; message: string }) => void,
): Promise<CircleWalletSession>;
