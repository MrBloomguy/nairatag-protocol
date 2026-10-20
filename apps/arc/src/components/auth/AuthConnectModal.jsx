import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
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
  circleInputType = 'email',
  circleInputPlaceholder = 'you@example.com',
  circleInputLabel = 'Email address',
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
          {screen === 'welcome' ? (
            <span className="auth-brand-wordmark">NAIRATAG</span>
          ) : (
            <button type="button" className="auth-back-button" onClick={() => setScreen('welcome')} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          <button type="button" className="auth-close-button" onClick={onClose} aria-label="Close sign in">
            <X size={18} />
          </button>
        </div>

        {screen === 'welcome' && (
          <div className="auth-welcome-screen">
            <div className="auth-hero-art" aria-hidden="true">
              <span className="auth-orbit auth-orbit-one" />
              <span className="auth-orbit auth-orbit-two" />
              <div className="auth-hero-coin">₦</div>
              <span className="auth-hero-spark auth-hero-spark-one">✦</span>
              <span className="auth-hero-spark auth-hero-spark-two">✦</span>
            </div>
            <div className="auth-welcome-copy">
              <p className="auth-eyebrow">YOUR MONEY, YOUR NAME</p>
              <h2 id="auth-screen-title">Your NairaTag<br />starts here.</h2>
              <p>One account for your Arc wallet, payments, and agents.</p>
            </div>
            <div className="auth-welcome-actions">
              <button type="button" className="auth-main-cta" onClick={() => setScreen('create')}>
                Create an account <ArrowRight size={17} />
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
              <p className="auth-eyebrow">{screen === 'create' ? 'GET STARTED' : 'GOOD TO SEE YOU'}</p>
              <h2 id="auth-screen-title">{screen === 'create' ? 'Create your account' : 'Welcome back'}</h2>
              <p>{screen === 'create'
                ? circleInputType === 'email'
                  ? 'Start with your email. Your Arc wallet is created securely—no seed phrase to manage.'
                  : 'Continue with email or NairaTag. Circle securely creates or reconnects your Arc wallet.'
                : 'Sign in with the email linked to your NairaTag account.'}</p>
            </div>

            <div className="auth-provider-note">
              <div className="auth-provider-mark"><ShieldCheck size={17} /></div>
              <div><strong>Secure email sign-in</strong><span>Wallet powered by Circle</span></div>
              <span className="auth-no-seed-pill">NO SEED PHRASE</span>
            </div>

            {!circleOtpSent ? (
              <form onSubmit={(event) => { event.preventDefault(); handleConnectCircle(); }} className="auth-email-form">
                <label htmlFor="circle-auth-email">{circleInputLabel}</label>
                <div className="circle-auth-input-wrapper">
                  <AtSign size={16} className="circle-input-icon" />
                  <input
                    id="circle-auth-email"
                    type={circleInputType}
                    className="circle-auth-input"
                    placeholder={circleInputPlaceholder}
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
              <div className="auth-otp-step">
                <div className="auth-otp-message">
                  <span className="auth-otp-icon"><Check size={16} /></span>
                  <span>Circle sent a verification code to <strong>{circleInput}</strong>. Continue in Circle’s verification window.</span>
                </div>
                <button type="button" className="auth-main-cta" onClick={handleVerifyCircle} disabled={isConnecting}>
                  {isConnecting
                    ? <><RefreshCw size={15} className="animate-spin" /><span>{circleStatus || 'Connecting...'}</span></>
                    : <><span>Verify and continue</span><ArrowRight size={17} /></>}
                </button>
                <button type="button" className="auth-text-button" onClick={() => setCircleOtpSent(false)} disabled={isConnecting}>
                  Use a different email
                </button>
              </div>
            )}

            <div className="auth-form-switch">
              {screen === 'create'
                ? <>Already have an account? <button type="button" onClick={() => setScreen('signin')}>Sign in</button></>
                : <>New to NairaTag? <button type="button" onClick={() => setScreen('create')}>Create an account</button></>}
            </div>
            <div className="auth-modal-divider"><span>OR</span></div>
            <button type="button" className="auth-wallet-text-link" onClick={() => setScreen('wallets')}>
              <Wallet size={16} /> Connect a browser wallet
            </button>
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
