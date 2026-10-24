import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  ChevronRight,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';

export default function AuthConnectModal({
  onClose,
  isConnecting,
  circleInput,
  setCircleInput,
  circleOtpSent,
  setCircleOtpSent,
  circleStatus,
  handleConnectCircle,
  handleVerifyCircle,
  handleConnect,
}) {
  const [screen, setScreen] = useState('welcome');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-dialog connect-modal-dialog auth-screen-${screen}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-screen-title"
      >
        <div className="auth-modal-topbar">
          {screen !== 'welcome' && !circleOtpSent ? (
            <button type="button" className="auth-back-button" onClick={() => setScreen('welcome')} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          ) : <span />}
          <button type="button" className="auth-close-button" onClick={onClose} aria-label="Close sign in">
            <X size={18} />
          </button>
        </div>

        {screen === 'welcome' && (
          <div className="auth-welcome-screen">
            <div className="auth-hero-art" aria-hidden="true">
              <span className="auth-orbit auth-orbit-one" />
              <span className="auth-orbit auth-orbit-two" />
              <img className="auth-hero-logo" src="/nairatag-logo.png" alt="NairaTag" />
              <span className="auth-hero-spark auth-hero-spark-one">✦</span>
              <span className="auth-hero-spark auth-hero-spark-two">✦</span>
            </div>
            <div className="auth-welcome-copy">
              <h2 id="auth-screen-title">Your NairaTag<br />starts here.</h2>
            </div>
            <div className="auth-welcome-actions">
              <button type="button" className="auth-main-cta" onClick={() => setScreen('create')}>
                Continue with email <ArrowRight size={17} />
              </button>
              <button type="button" className="auth-signin-link" onClick={() => setScreen('signin')}>
                I already have an account <span>Sign in</span>
              </button>
            </div>
            <div className="auth-welcome-footer">
              <span>Already have a wallet?</span>
              <button type="button" onClick={() => setScreen('wallets')}>Connect it</button>
            </div>
          </div>
        )}

        {(screen === 'create' || screen === 'signin') && (
          <div className="auth-form-screen">
            <div className="auth-form-heading">
              <h2 id="auth-screen-title">{screen === 'create' ? 'Create your account' : 'Welcome back'}</h2>
              <p>{screen === 'create'
                ? 'Sign up with email. Your Arc wallet is created securely, with no seed phrase to manage.'
                : 'Sign in with the email linked to your NairaTag account.'}</p>
            </div>

            {!circleOtpSent ? (
              <form onSubmit={(event) => { event.preventDefault(); handleConnectCircle(); }} className="auth-email-form">
                <label htmlFor="circle-auth-email">Email address</label>
                <div className="circle-auth-input-wrapper">
                  <AtSign size={16} className="circle-input-icon" />
                  <input
                    id="circle-auth-email"
                    type="email"
                    className="circle-auth-input"
                    placeholder="you@example.com"
                    value={circleInput}
                    onChange={(event) => setCircleInput(event.target.value)}
                    disabled={isConnecting}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="auth-main-cta" disabled={isConnecting || !circleInput.trim()}>
                  {isConnecting && circleStatus
                    ? <><RefreshCw size={15} className="animate-spin" /><span>{circleStatus}</span></>
                    : <><span>{screen === 'create' ? 'Create account with email' : 'Continue with email'}</span><ArrowRight size={17} /></>}
                </button>
              </form>
            ) : (
              <div className="auth-otp-step" aria-live="polite">
                <div className="auth-otp-heading">
                  <span className="auth-otp-icon"><Check size={16} /></span>
                  <div>
                    <strong>Check your email</strong>
                    <span>{circleInput}</span>
                  </div>
                </div>
                <p className="auth-otp-helper">Complete verification in Circle’s window, then continue.</p>
                <button type="button" className="auth-main-cta" onClick={handleVerifyCircle} disabled={isConnecting}>
                  {isConnecting
                    ? <><RefreshCw size={15} className="animate-spin" /><span>{circleStatus || 'Connecting...'}</span></>
                    : <><span>Continue</span><ArrowRight size={17} /></>}
                </button>
                <button type="button" className="auth-text-button" onClick={() => setCircleOtpSent(false)} disabled={isConnecting}>
                  Use a different email
                </button>
              </div>
            )}

            {!circleOtpSent && <div className="auth-form-switch">
              {screen === 'create'
                ? <>Already have an account? <button type="button" onClick={() => setScreen('signin')}>Sign in</button></>
                : <>New to NairaTag? <button type="button" onClick={() => setScreen('create')}>Create an account</button></>}
            </div>}
            {!circleOtpSent && <button type="button" className="auth-wallet-text-link" onClick={() => setScreen('wallets')}>
              <Wallet size={16} /> Connect a browser wallet
            </button>}
          </div>
        )}

        {screen === 'wallets' && (
          <div className="auth-form-screen auth-wallet-screen">
            <div className="auth-form-heading">
              <p className="auth-eyebrow">USE YOUR OWN WALLET</p>
              <h2 id="auth-screen-title">Connect a wallet</h2>
              <p>Choose a wallet already on your device.</p>
            </div>
            <div className="auth-wallet-list">
              {[
                { name: 'Arc Wallet', type: 'Arc Wallet', badge: 'ARC TESTNET' },
                { name: 'MetaMask', type: 'MetaMask' },
                { name: 'Coinbase Wallet', type: 'Coinbase Wallet' },
                { name: 'WalletConnect', type: 'WalletConnect' },
              ].map((wallet) => (
                <button key={wallet.name} type="button" className="auth-wallet-option" disabled={isConnecting} onClick={() => handleConnect(wallet.type)}>
                  <span className="auth-wallet-option-icon"><Wallet size={17} /></span>
                  <span className="auth-wallet-option-name">{wallet.name}</span>
                  {wallet.badge && <span className="auth-wallet-network-pill">{wallet.badge}</span>}
                  <ChevronRight size={17} className="auth-wallet-chevron" />
                </button>
              ))}
            </div>
            <div className="auth-wallet-footnote">Your wallet stays under your control.</div>
          </div>
        )}
      </div>
    </div>
  );
}
