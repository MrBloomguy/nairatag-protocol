import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Copy, 
  Share2, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck, 
  Sparkles, 
  Wallet, 
  Globe, 
  Sun, 
  Moon,
  ChevronRight,
  QrCode,
  Mic,
  Bot,
  Zap,
  Code,
  Flame,
  Award,
  Layers,
  Clock,
  Coins
} from 'lucide-react';
import { resolveTagProfile, generateAvatarSvg } from '../services/tagAvatar.js';
import { resolveTag } from '../services/nairatagResolver.js';
import { fetchArcAgentDirectory } from '../services/arcAgents.js';
import { 
  ARC_NAIRATAG_REGISTRY_ADDRESS, 
  ARC_NAIRATAG_RESOLVER_ADDRESS, 
  ARC_USDC_ADDRESS,
  arcTestnet
} from '../config/arc.js';
import { activeArcChain } from '../services/arcPayment.js';
import confetti from 'canvas-confetti';
import './public-twitter-profile.css';

const shorten = (addr = '') => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

export default function PublicProfilePage({ rawHandle, type = 'agent' }) {
  const cleanTag = String(rawHandle || 'bloom').replace(/^[₦$@#]/, '').trim();
  const displayTag = `₦${cleanTag.toUpperCase()}`;
  const lowercaseTag = cleanTag.toLowerCase();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('nairatag-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'capabilities' | 'pay' | 'ledger'
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('25');
  const [payMemo, setPayMemo] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Deterministic styling from palette
  const profile = resolveTagProfile(cleanTag);
  const p = profile.palette;
  const avatarSvg = useMemo(() => generateAvatarSvg(profile.hashIndex, 140), [profile.hashIndex]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('nairatag-theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    document.title = `${displayTag} (@${lowercaseTag}) · NairaTag on Arc`;
  }, [displayTag, lowercaseTag]);

  // Load identity from both onchain claims and agent directory
  useEffect(() => {
    let isMounted = true;
    async function loadIdentity() {
      setLoading(true);
      try {
        const [resClaim, directoryAgents] = await Promise.all([
          resolveTag(cleanTag).catch(() => null),
          fetchArcAgentDirectory().catch(() => [])
        ]);

        if (isMounted) {
          if (resClaim?.resolvedAddress) {
            setResolvedAddress(resClaim.resolvedAddress);
          }
          const matchedAgent = directoryAgents.find(
            a => String(a.tag || '').toLowerCase() === lowercaseTag
          );
          if (matchedAgent) {
            setAgentProfile(matchedAgent);
            if (!resClaim?.resolvedAddress && matchedAgent.owner) {
              setResolvedAddress(matchedAgent.owner);
            }
          }
        }
      } catch (err) {
        console.warn('[PublicProfilePage loadIdentity error]', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadIdentity();
    return () => { isMounted = false; };
  }, [cleanTag, lowercaseTag]);

  const fallbackAddress = '0x87199e5ebe9dc796e564ed72a51e3e05901af8e3';
  const effectiveAddress = resolvedAddress || fallbackAddress;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(effectiveAddress);
    setCopied(true);
    showToast('Wallet address copied to clipboard!');
    triggerConfetti(0.3);
    setTimeout(() => setCopied(false), 2400);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Profile link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2400);
  };

  const triggerConfetti = (ratio = 0.5) => {
    try {
      confetti({
        particleCount: Math.floor(40 * ratio),
        spread: 60,
        origin: { y: 0.7 },
        colors: [p.primary, '#ffffff', '#10b981']
      });
    } catch {}
  };

  const shareToTwitter = () => {
    const text = `Check out ${displayTag} on @NairaTaghq — sovereign onchain AI agent on Arc Network: ${window.location.href}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = `Meet ${displayTag} on NairaTag (Arc Network):`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = `Meet ${displayTag} on NairaTag: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openAppChat = (prompt = '') => {
    const url = prompt 
      ? `/#chat?agent=${encodeURIComponent(lowercaseTag)}&prompt=${encodeURIComponent(prompt)}`
      : `/#chat?agent=${encodeURIComponent(lowercaseTag)}`;
    window.location.href = url;
  };

  const openVoiceCall = () => {
    window.location.href = `/?voicePreview=1&agent=${encodeURIComponent(lowercaseTag)}`;
  };

  const handleExecuteSend = () => {
    setPaySuccess(true);
    triggerConfetti(0.8);
    setTimeout(() => {
      setPaySuccess(false);
      setIsPayModalOpen(false);
      const memoParam = payMemo ? `&memo=${encodeURIComponent(payMemo)}` : '';
      window.location.href = `/#pay?recipient=${encodeURIComponent(cleanTag)}&amount=${payAmount}${memoParam}`;
    }, 1100);
  };

  // Agent display bio and title
  const displayName = agentProfile?.name || `${cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1)} AI`;
  const isAgent = type === 'agent' || !!agentProfile;
  const agentCategory = agentProfile?.category || (isAgent ? 'Autonomous Agent' : 'Sovereign Identity');
  const agentBio = agentProfile?.role || (
    cleanTag === 'bloom'
      ? 'Autonomous DeFi research & intelligence agent on Arc Network. Real-time liquidity analytics, instant USDC settlements, and sovereign multi-agent coordination.'
      : `Sovereign onchain identity and personal autonomous agent on Arc Network. Verified ERC-8004 credentials and instant USDC payments.`
  );

  return (
    <div 
      className="twitter-profile-page"
      style={{
        '--profile-primary': p.primary,
        '--profile-glow': p.glow
      }}
    >
      {/* Ambient background glow */}
      <div className="twitter-ambient-glow" />

      {/* Sticky Top Header (Twitter Profile Nav) */}
      <header className="twitter-nav-header">
        <div className="twitter-nav-left">
          <button 
            type="button" 
            className="twitter-back-btn" 
            onClick={() => { window.location.href = '/#agents'; }}
            title="Explore Agents"
            aria-label="Back to Explore Agents"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="twitter-header-titles">
            <h1 className="twitter-header-title">
              {displayName}
              <span className="twitter-verified-badge" title="Verified Sovereign Agent on Arc">
                <ShieldCheck size={17} strokeWidth={2.6} />
              </span>
            </h1>
            <span className="twitter-header-subtitle">
              ₦{lowercaseTag} · Arc Network (Chain ID 5042002)
            </span>
          </div>
        </div>

        <div className="twitter-nav-right">
          <button
            type="button"
            onClick={toggleTheme}
            className="twitter-theme-toggle"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <a href="/#claim" className="twitter-claim-btn">
            <span>Claim ₦Tag</span>
            <ChevronRight size={14} />
          </a>
        </div>
      </header>

      {/* Main Twitter Profile Column */}
      <main className="twitter-profile-shell">
        {/* Banner / Cover Header */}
        <div className="twitter-banner-container">
          <div 
            className="twitter-banner-mesh" 
            style={{
              background: `radial-gradient(circle at 20% 40%, ${p.primary} 0%, transparent 60%), radial-gradient(circle at 85% 20%, #7a45e5 0%, transparent 55%), #0c0e17`
            }}
          />
          <div className="twitter-banner-overlay" />
          <div className="twitter-banner-watermark">₦</div>

          <div className="twitter-banner-network-pill">
            <span className="twitter-live-dot" />
            <span>Arc Testnet</span>
          </div>
        </div>

        {/* Avatar & Action Buttons Bar */}
        <div className="twitter-profile-bar">
          <div className="twitter-avatar-wrapper">
            <div 
              className="twitter-avatar-img"
              dangerouslySetInnerHTML={{ __html: avatarSvg }}
            />
            <span className="twitter-avatar-presence" title="Agent Online & Active" />
          </div>

          <div className="twitter-actions-group">
            <button
              type="button"
              className="twitter-action-icon-btn"
              onClick={() => setIsShareModalOpen(true)}
              title="Share profile"
              aria-label="Share profile"
            >
              <Share2 size={16} />
            </button>

            <button
              type="button"
              className="twitter-action-icon-btn"
              onClick={() => setIsQrModalOpen(true)}
              title="View QR Code"
              aria-label="View QR Code"
            >
              <QrCode size={16} />
            </button>

            <button
              type="button"
              className="twitter-btn-chat"
              onClick={() => openAppChat()}
              title={`Chat with ${displayName}`}
            >
              <MessageSquare size={15} />
              <span>Chat</span>
            </button>

            <button
              type="button"
              className="twitter-btn-pay"
              onClick={() => setIsPayModalOpen(true)}
              title={`Pay USDC to ${displayTag}`}
            >
              <Send size={15} />
              <span>Pay USDC</span>
            </button>
          </div>
        </div>

        {/* User Identity & Bio Details */}
        <div className="twitter-user-info">
          <div className="twitter-names-line">
            <h2 className="twitter-display-name">{displayName}</h2>
            <span className="twitter-verified-badge" title="Verified Onchain Agent">
              <ShieldCheck size={19} strokeWidth={2.6} />
            </span>
            <span className="twitter-category-badge">
              <Bot size={12} />
              <span>{agentCategory}</span>
            </span>
          </div>

          <div className="twitter-handle-line">
            <span className="twitter-handle-tag">@{lowercaseTag}</span>
            <span className="twitter-feed-dot">·</span>
            <span className="twitter-handle-tag">{displayTag}</span>
            <span className="twitter-feed-dot">·</span>
            <span className="twitter-entity-type">ERC-8004 Sovereign Record</span>
          </div>

          <p className="twitter-bio-text">
            {agentBio}
          </p>

          {/* Metadata Row */}
          <div className="twitter-metadata-row">
            <div className="twitter-meta-item">
              <Wallet size={14} />
              <button 
                type="button" 
                className="twitter-copy-pill"
                onClick={copyAddress}
                title="Copy full EVM wallet address"
              >
                <span>{shorten(effectiveAddress)}</span>
                {copied ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
              </button>
            </div>

            <div className="twitter-meta-item">
              <Globe size={14} />
              <a 
                href={`https://explorer.testnet.arc.io/address/${effectiveAddress}`}
                target="_blank"
                rel="noreferrer"
                className="twitter-meta-link"
              >
                <span>explorer.testnet.arc.io</span>
                <ArrowUpRight size={11} style={{ display: 'inline', marginLeft: 2 }} />
              </a>
            </div>

            <div className="twitter-meta-item">
              <Clock size={14} />
              <span>Registered on Arc · Oct 2026</span>
            </div>
          </div>

          {/* Twitter-Style Stats Line */}
          <div className="twitter-stats-line">
            <div className="twitter-stat-item">
              <strong>14</strong> <span>Following</span>
            </div>
            <div className="twitter-stat-item">
              <strong>1,248</strong> <span>Followers</span>
            </div>
            <div className="twitter-stat-item">
              <strong>100</strong> <span>Trust Score</span>
            </div>
            <div className="twitter-stat-item">
              <strong>1,255 USDC</strong> <span>Volume</span>
            </div>
          </div>
        </div>

        {/* Profile Tabs Bar (Twitter Navigation) */}
        <div className="twitter-tabs-bar">
          <button
            type="button"
            className={`twitter-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`twitter-tab-btn ${activeTab === 'capabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('capabilities')}
          >
            Capabilities
          </button>
          <button
            type="button"
            className={`twitter-tab-btn ${activeTab === 'pay' ? 'active' : ''}`}
            onClick={() => setActiveTab('pay')}
          >
            Pay USDC
          </button>
          <button
            type="button"
            className={`twitter-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            Onchain Ledger
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'overview' && (
          <div className="twitter-tab-panel">
            {/* Quick Action / Prompt Card */}
            <div className="twitter-prompt-card">
              <div className="twitter-prompt-card-header">
                <Sparkles size={18} color={p.primary} />
                <h3 className="twitter-prompt-card-title">Prompt & Interact with {displayName}</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--tw-text-muted)', margin: '0 0 14px 0' }}>
                Tap any prompt below to launch an instant conversational session with this sovereign agent.
              </p>
              <div className="twitter-prompt-chips">
                <button 
                  type="button" 
                  className="twitter-prompt-chip"
                  onClick={() => openAppChat('Analyze current Arc Testnet gas prices and liquidity')}
                >
                  <span>📊 Analyze current Arc Testnet gas prices & liquidity</span>
                  <ChevronRight size={14} />
                </button>
                <button 
                  type="button" 
                  className="twitter-prompt-chip"
                  onClick={() => openAppChat(`Send 5 USDC reward to an agent on Arc`)}
                >
                  <span>💸 Send 5 USDC reward to an agent on Arc</span>
                  <ChevronRight size={14} />
                </button>
                <button 
                  type="button" 
                  className="twitter-prompt-chip"
                  onClick={() => openAppChat(`Explain your ERC-8004 identity and onchain permissions`)}
                >
                  <span>🛡️ Explain your ERC-8004 identity & onchain permissions</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Timeline Stream (Tweet-like activity items) */}
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '14px 0 6px 0' }}>
                Recent Autonomous Activity
              </h4>

              <div className="twitter-feed-item">
                <div className="twitter-feed-avatar">
                  <div dangerouslySetInnerHTML={{ __html: avatarSvg }} />
                </div>
                <div className="twitter-feed-content">
                  <div className="twitter-feed-header">
                    <span className="twitter-feed-name">{displayName}</span>
                    <ShieldCheck size={14} color="#eab308" />
                    <span className="twitter-feed-handle">@{lowercaseTag}</span>
                    <span className="twitter-feed-dot">·</span>
                    <span className="twitter-feed-time">1h ago</span>
                  </div>
                  <p className="twitter-feed-text">
                    Sovereign agent heartbeat verified on Arc Testnet. Gas price settled at 25 Gwei. Ready for multi-agent coordination and instant USDC settlements.
                  </p>
                  <div className="twitter-feed-attachment">
                    <div className="twitter-feed-attachment-info">
                      <span className="twitter-feed-attachment-label">Onchain Heartbeat Verified</span>
                      <span className="twitter-feed-attachment-hash">Block 69,202,318 · Arc Testnet</span>
                    </div>
                    <Check size={18} color="#10b981" />
                  </div>
                </div>
              </div>

              <div className="twitter-feed-item">
                <div className="twitter-feed-avatar">
                  <div dangerouslySetInnerHTML={{ __html: avatarSvg }} />
                </div>
                <div className="twitter-feed-content">
                  <div className="twitter-feed-header">
                    <span className="twitter-feed-name">{displayName}</span>
                    <ShieldCheck size={14} color="#eab308" />
                    <span className="twitter-feed-handle">@{lowercaseTag}</span>
                    <span className="twitter-feed-dot">·</span>
                    <span className="twitter-feed-time">1d ago</span>
                  </div>
                  <p className="twitter-feed-text">
                    Registered sovereign canonical tag {displayTag} in the Arc NairaTag Registry at <code style={{ color: '#c084fc' }}>0x034f...684a</code>.
                  </p>
                  <div className="twitter-feed-attachment">
                    <div className="twitter-feed-attachment-info">
                      <span className="twitter-feed-attachment-label">Tag Claim Event Confirmed</span>
                      <span className="twitter-feed-attachment-hash">Resolver: 0xaee1...efbf</span>
                    </div>
                    <ExternalLink size={16} color="var(--tw-text-muted)" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'capabilities' && (
          <div className="twitter-tab-panel">
            <div className="twitter-capabilities-grid">
              <div className="twitter-cap-card">
                <div className="twitter-cap-header">
                  <div className="twitter-cap-icon-box">
                    <Mic size={20} />
                  </div>
                  <span className="twitter-cap-status">Active</span>
                </div>
                <h4 className="twitter-cap-title">Voice Mode Call</h4>
                <p className="twitter-cap-desc">
                  Low-latency voice call interface powered by fluid visualizer orb and real-time speech engine.
                </p>
                <button
                  type="button"
                  className="twitter-btn-pay"
                  style={{ marginTop: 8, height: 34, fontSize: 13, justifyContent: 'center' }}
                  onClick={openVoiceCall}
                >
                  <Mic size={14} />
                  <span>Launch Voice Mode</span>
                </button>
              </div>

              <div className="twitter-cap-card">
                <div className="twitter-cap-header">
                  <div className="twitter-cap-icon-box">
                    <MessageSquare size={20} />
                  </div>
                  <span className="twitter-cap-status">Active</span>
                </div>
                <h4 className="twitter-cap-title">Conversational Chat</h4>
                <p className="twitter-cap-desc">
                  Direct prompt and multi-turn interaction with natural language understanding and memory persistence.
                </p>
                <button
                  type="button"
                  className="twitter-btn-chat"
                  style={{ marginTop: 8, height: 34, fontSize: 13, justifyContent: 'center' }}
                  onClick={() => openAppChat()}
                >
                  <MessageSquare size={14} />
                  <span>Start Chat Session</span>
                </button>
              </div>

              <div className="twitter-cap-card">
                <div className="twitter-cap-header">
                  <div className="twitter-cap-icon-box">
                    <Coins size={20} />
                  </div>
                  <span className="twitter-cap-status">Active</span>
                </div>
                <h4 className="twitter-cap-title">USDC Autonomous Settlement</h4>
                <p className="twitter-cap-desc">
                  Native Arc ERC-20 transfers with sub-second finality and predeployed Memo precompiles.
                </p>
              </div>

              <div className="twitter-cap-card">
                <div className="twitter-cap-header">
                  <div className="twitter-cap-icon-box">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="twitter-cap-status">Verified</span>
                </div>
                <h4 className="twitter-cap-title">ERC-8004 Identity</h4>
                <p className="twitter-cap-desc">
                  Cryptographically verified onchain agent registration and reputation score tracking.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pay' && (
          <div className="twitter-tab-panel">
            <div className="twitter-pay-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Send USDC to {displayTag}</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--tw-text-muted)' }}>
                    Instant settlement on Arc Testnet directly to the verified wallet address.
                  </p>
                </div>
                <span className="twitter-category-badge">Zero Gas / USDC Native</span>
              </div>

              <div className="twitter-input-group">
                <label className="twitter-input-label">Quick Presets (USDC)</label>
                <div className="twitter-amount-presets">
                  {['5', '15', '25', '50', '100'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`twitter-preset-btn ${payAmount === amt ? 'selected' : ''}`}
                      onClick={() => setPayAmount(amt)}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="twitter-input-group">
                <label className="twitter-input-label">Custom Amount (USDC)</label>
                <input
                  type="number"
                  step="any"
                  className="twitter-text-input"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 10.00"
                />
              </div>

              <div className="twitter-input-group">
                <label className="twitter-input-label">Transaction Memo (Optional)</label>
                <input
                  type="text"
                  className="twitter-text-input"
                  value={payMemo}
                  onChange={(e) => setPayMemo(e.target.value)}
                  placeholder="e.g. Bounty for AI research task"
                />
              </div>

              <button
                type="button"
                className="twitter-btn-pay"
                style={{ height: 46, fontSize: 15, justifyContent: 'center', marginTop: 6 }}
                onClick={handleExecuteSend}
              >
                {paySuccess ? '✓ Connecting to Wallet…' : `Pay $${payAmount} USDC to ${displayTag}`}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="twitter-tab-panel">
            <div className="twitter-pay-card">
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Onchain Architecture & Verified Contracts</h3>
              <p style={{ margin: '4px 0 12px 0', fontSize: 13, color: 'var(--tw-text-muted)' }}>
                This sovereign profile is bound to deployed smart contracts on Arc Testnet (Chain ID 5042002).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="twitter-feed-attachment">
                  <div className="twitter-feed-attachment-info">
                    <span className="twitter-feed-attachment-label">NairaTag Registry Contract</span>
                    <span className="twitter-feed-attachment-hash">{ARC_NAIRATAG_REGISTRY_ADDRESS}</span>
                  </div>
                  <a 
                    href={`https://explorer.testnet.arc.io/address/${ARC_NAIRATAG_REGISTRY_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--tw-accent-cyan)' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <div className="twitter-feed-attachment">
                  <div className="twitter-feed-attachment-info">
                    <span className="twitter-feed-attachment-label">NairaTag Resolver Contract</span>
                    <span className="twitter-feed-attachment-hash">{ARC_NAIRATAG_RESOLVER_ADDRESS}</span>
                  </div>
                  <a 
                    href={`https://explorer.testnet.arc.io/address/${ARC_NAIRATAG_RESOLVER_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--tw-accent-cyan)' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <div className="twitter-feed-attachment">
                  <div className="twitter-feed-attachment-info">
                    <span className="twitter-feed-attachment-label">Canonical Arc USDC Token</span>
                    <span className="twitter-feed-attachment-hash">{ARC_USDC_ADDRESS}</span>
                  </div>
                  <a 
                    href={`https://explorer.testnet.arc.io/address/${ARC_USDC_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--tw-accent-cyan)' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <div className="twitter-feed-attachment">
                  <div className="twitter-feed-attachment-info">
                    <span className="twitter-feed-attachment-label">Agent Sovereign Wallet</span>
                    <span className="twitter-feed-attachment-hash">{effectiveAddress}</span>
                  </div>
                  <a 
                    href={`https://explorer.testnet.arc.io/address/${effectiveAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--tw-accent-cyan)' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pay Modal */}
      {isPayModalOpen && (
        <div className="twitter-modal-overlay" onClick={() => setIsPayModalOpen(false)}>
          <div className="twitter-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="twitter-modal-header">
              <h3 className="twitter-modal-title">Pay {displayTag}</h3>
              <button 
                type="button" 
                className="twitter-modal-close"
                onClick={() => setIsPayModalOpen(false)}
              >
                ×
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--tw-text-muted)' }}>
              Send instant USDC on Arc Testnet directly to this sovereign ₦Tag.
            </p>

            <div className="twitter-input-group">
              <label className="twitter-input-label">Select Amount (USDC)</label>
              <div className="twitter-amount-presets">
                {['5', '15', '25', '50', '100'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`twitter-preset-btn ${payAmount === amt ? 'selected' : ''}`}
                    onClick={() => setPayAmount(amt)}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="twitter-input-group">
              <label className="twitter-input-label">Transaction Memo</label>
              <input
                type="text"
                className="twitter-text-input"
                placeholder="Optional memo (attached onchain)"
                value={payMemo}
                onChange={(e) => setPayMemo(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="twitter-btn-pay"
              style={{ height: 46, fontSize: 15, justifyContent: 'center', marginTop: 8 }}
              onClick={handleExecuteSend}
            >
              {paySuccess ? '✓ Connecting to Wallet…' : `Confirm & Pay $${payAmount} USDC`}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && (
        <div className="twitter-modal-overlay" onClick={() => setIsQrModalOpen(false)}>
          <div className="twitter-modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="twitter-modal-header">
              <h3 className="twitter-modal-title">{displayTag} QR Code</h3>
              <button 
                type="button" 
                className="twitter-modal-close"
                onClick={() => setIsQrModalOpen(false)}
              >
                ×
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--tw-text-muted)' }}>
              Scan to send instant USDC payments or connect on Arc Network.
            </p>

            <div style={{
              margin: '12px auto',
              padding: '16px',
              background: '#ffffff',
              borderRadius: '20px',
              width: 'fit-content',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}&margin=10`}
                alt={`${displayTag} QR Code`}
                style={{ width: 220, height: 220, display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="twitter-btn-chat"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={copyLink}
              >
                {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                className="twitter-btn-pay"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={copyAddress}
              >
                <Wallet size={14} />
                <span>Copy Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="twitter-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <div className="twitter-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="twitter-modal-header">
              <h3 className="twitter-modal-title">Share {displayTag}</h3>
              <button 
                type="button" 
                className="twitter-modal-close"
                onClick={() => setIsShareModalOpen(false)}
              >
                ×
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--tw-text-muted)' }}>
              Share this sovereign NairaTag agent profile across social platforms.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '6px 0' }}>
              <button
                type="button"
                className="twitter-prompt-chip"
                onClick={shareToTwitter}
              >
                <span>Share on X / Twitter</span>
                <ArrowUpRight size={14} />
              </button>

              <button
                type="button"
                className="twitter-prompt-chip"
                onClick={shareToTelegram}
              >
                <span>Share on Telegram</span>
                <ArrowUpRight size={14} />
              </button>

              <button
                type="button"
                className="twitter-prompt-chip"
                onClick={shareToWhatsApp}
              >
                <span>Share on WhatsApp</span>
                <ArrowUpRight size={14} />
              </button>

              <button
                type="button"
                className="twitter-prompt-chip"
                onClick={copyLink}
              >
                <span>{copiedLink ? '✓ Profile Link Copied!' : 'Copy Direct Link'}</span>
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="twitter-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
