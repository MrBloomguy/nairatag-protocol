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
  Bot,
  Zap,
  Code,
  Layers,
  Coins
} from 'lucide-react';
import { resolveTagProfile, generateAvatarSvg } from '../services/tagAvatar.js';
import { resolveTag } from '../services/nairatagResolver.js';
import { fetchArcAgentDirectory, KNOWN_AGENT_LOGOS, getOriginalAgentLogo } from '../services/arcAgents.js';
import { 
  ARC_NAIRATAG_REGISTRY_ADDRESS, 
  ARC_NAIRATAG_RESOLVER_ADDRESS, 
  ARC_USDC_ADDRESS,
  ARC_ERC8004_IDENTITY_REGISTRY,
  ARC_ERC8004_REPUTATION_REGISTRY
} from '../config/arc.js';
import confetti from 'canvas-confetti';
import './public-twitter-profile.css';

const shorten = (addr = '') => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

// Helper for contextual prompts and tools per agent
const getAgentSpec = (handle = '') => {
  const h = String(handle).toLowerCase().replace(/^[₦$@#]/, '');
  if (h === 'defillama') {
    return {
      prompts: [
        { label: '📊 Top 5 protocols by TVL on DefiLlama', query: '@defillama what are top 5 protocols by TVL?' },
        { label: '💎 Compare AAVE vs Uniswap TVL', query: '@defillama compare Aave and Uniswap TVL' },
        { label: '🌐 Global DeFi TVL breakdown', query: '@defillama what is the total global DeFi TVL?' }
      ],
      tools: [
        { name: 'defillama.tvl', desc: 'Real-time protocol TVL & chain rankings', badge: 'Live API', query: '@defillama get TVL rankings' },
        { name: 'defillama.coins', desc: 'Token prices & liquidity pool stats', badge: 'Oracle', query: '@defillama check stablecoin liquidity' },
        { name: 'arc.usdc_settlement', desc: 'Instant peer-to-peer USDC payments', badge: 'Onchain', query: 'Send 5 USDC reward to @defillama' }
      ]
    };
  }
  if (h === 'meteo') {
    return {
      prompts: [
        { label: '🌤️ Lagos weather & dispatch risk score', query: '@meteo what is Lagos weather and delivery risk?' },
        { label: '🌧️ Abuja precipitation and ETA delay impact', query: '@meteo Abuja rain and ETA delay forecast' },
        { label: '🚚 Kano transit logistics weather check', query: '@meteo Kano road conditions and temperature' }
      ],
      tools: [
        { name: 'meteo.delivery_impact', desc: 'Precipitation & dispatch delay scoring', badge: 'Live Forecast', query: '@meteo check delivery delay index' },
        { name: 'meteo.route_risk', desc: 'Logistics road condition alerts for NG cities', badge: 'Realtime', query: '@meteo check road risk in Lagos' },
        { name: 'arc.usdc_settlement', desc: 'Instant automated driver / agent dispatch payouts', badge: 'Onchain', query: 'Send 5 USDC to @meteo' }
      ]
    };
  }
  if (h === 'coingecko') {
    return {
      prompts: [
        { label: '💱 Live USDC to NGN market exchange rate', query: '@coingecko what is current USDC NGN exchange rate?' },
        { label: '📈 BTC & ETH 24h market momentum', query: '@coingecko Bitcoin and Ethereum price momentum' },
        { label: '📊 Arc Testnet USDC peg & FX valuation', query: '@coingecko USDC peg and parallel FX spread' }
      ],
      tools: [
        { name: 'coingecko.usdc_ngn', desc: 'Real-time USDC/NGN and USD/NGN FX quotes', badge: 'Live FX', query: '@coingecko get USDC/NGN rate' },
        { name: 'coingecko.market_pulse', desc: 'Crypto market 24h volume & momentum', badge: 'Oracle', query: '@coingecko market pulse' },
        { name: 'arc.usdc_settlement', desc: 'Micro-settlements on Arc Testnet', badge: 'Onchain', query: 'Send 5 USDC to @coingecko' }
      ]
    };
  }
  return {
    prompts: [
      { label: '⚡ Arc gas fees & liquidity overview', query: 'Analyze current Arc Testnet gas prices and liquidity' },
      { label: `💸 Send 5 USDC to ₦${h.toUpperCase()}`, query: `Send 5 USDC reward to @${h} on Arc` },
      { label: '🛡️ Verify ERC-8004 sovereign registry record', query: `Explain ERC-8004 identity for @${h}` }
    ],
    tools: [
      { name: 'arc.usdc_settlement', desc: 'Zero-gas native USDC transfers on Arc', badge: 'Instant', query: `Send 10 USDC to @${h}` },
      { name: 'arc.voice_mode', desc: 'Voice call interface with low latency speech orb', badge: 'Voice', query: `Start voice session with @${h}` },
      { name: 'arc.erc8004_identity', desc: 'Onchain agent credential & reputation registry', badge: 'Verified', query: `Inspect ERC-8004 identity @${h}` }
    ]
  };
};

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

  const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'pay' | 'onchain'
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

  const profile = resolveTagProfile(cleanTag);
  const p = profile.palette;
  const avatarSvg = useMemo(() => generateAvatarSvg(profile.hashIndex, 120), [profile.hashIndex]);
  const spec = useMemo(() => getAgentSpec(cleanTag), [cleanTag]);

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

  const displayName = agentProfile?.name || `${cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1)} AI`;
  const isAgent = type === 'agent' || !!agentProfile;
  const agentCategory = agentProfile?.category || (isAgent ? 'Autonomous Agent' : 'Sovereign Identity');
  const agentBio = agentProfile?.role || (
    cleanTag === 'bloom'
      ? 'Autonomous DeFi research & intelligence agent on Arc Network. Real-time liquidity analytics and instant USDC settlements.'
      : `Sovereign onchain identity and personal autonomous agent on Arc Network. Verified ERC-8004 credentials.`
  );

  return (
    <div 
      className="twitter-profile-page"
      style={{
        '--profile-primary': p.primary,
        '--profile-glow': p.glow
      }}
    >
      <div className="twitter-ambient-glow" />

      {/* Top Navigation */}
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
                <ShieldCheck size={16} strokeWidth={2.6} />
              </span>
            </h1>
            <span className="twitter-header-subtitle">
              ₦{lowercaseTag} · Arc Testnet
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

      {/* Main Profile Shell */}
      <main className="twitter-profile-shell">
        {/* Subtle accent border at top instead of bulky banner */}
        <div className="profile-top-accent" />

        {/* Profile Header Bar: Avatar + Action CTAs */}
        <div className="twitter-profile-bar">
          <div className="twitter-avatar-wrapper">
            {KNOWN_AGENT_LOGOS[cleanHandle] ? (
              <img
                src={KNOWN_AGENT_LOGOS[cleanHandle]}
                alt={profile.displayName || cleanHandle}
                className="twitter-avatar-img"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div 
                className="twitter-avatar-img"
                dangerouslySetInnerHTML={{ __html: avatarSvg }}
              />
            )}
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

        {/* Identity & Bio */}
        <div className="twitter-user-info">
          <div className="twitter-names-line">
            <h2 className="twitter-display-name">{displayName}</h2>
            <span className="twitter-verified-badge" title="Verified Onchain Agent">
              <ShieldCheck size={18} strokeWidth={2.6} />
            </span>
            <span className="twitter-category-badge">
              <Bot size={12} />
              <span>{agentCategory}</span>
            </span>
          </div>

          <div className="twitter-handle-line">
            <span className="twitter-handle-tag">@{lowercaseTag}</span>
            <span className="twitter-feed-dot">·</span>
            <span className="twitter-handle-tag" style={{ color: 'var(--profile-primary, #7a45e5)' }}>{displayTag}</span>
            <span className="twitter-feed-dot">·</span>
            <span className="twitter-entity-type">ERC-8004 Sovereign Record</span>
          </div>

          <p className="twitter-bio-text">
            {agentBio}
          </p>

          {/* Compact Metadata Row */}
          <div className="twitter-metadata-row">
            <div className="twitter-meta-item">
              <Wallet size={13} />
              <button 
                type="button" 
                className="twitter-copy-pill"
                onClick={copyAddress}
                title="Copy EVM wallet address"
              >
                <span>{shorten(effectiveAddress)}</span>
                {copied ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
              </button>
            </div>

            <div className="twitter-meta-item">
              <ShieldCheck size={13} color="#10b981" />
              <a 
                href={`https://explorer.testnet.arc.io/token/${ARC_ERC8004_IDENTITY_REGISTRY}`}
                target="_blank"
                rel="noreferrer"
                className="twitter-meta-link"
              >
                <span style={{ color: '#10b981', fontWeight: 650 }}>ERC-8004 Verified</span>
                <ArrowUpRight size={11} style={{ marginLeft: 2 }} />
              </a>
            </div>

            <div className="twitter-meta-item">
              <Globe size={13} />
              <span style={{ color: 'var(--tw-text-muted)' }}>Arc Testnet (5042002)</span>
            </div>
          </div>

          {/* Twitter-Style Compact Stats */}
          <div className="twitter-stats-line">
            <div className="twitter-stat-item">
              <strong>100/100</strong> <span>Trust Score</span>
            </div>
            <div className="twitter-stat-item">
              <strong>$1,255</strong> <span>USDC Vol</span>
            </div>
            <div className="twitter-stat-item">
              <strong>Live</strong> <span>Autonomous</span>
            </div>
          </div>
        </div>

        {/* Streamlined Profile Tabs Bar */}
        <div className="twitter-tabs-bar">
          <button
            type="button"
            className={`twitter-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            Prompts & Tools
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
            className={`twitter-tab-btn ${activeTab === 'onchain' ? 'active' : ''}`}
            onClick={() => setActiveTab('onchain')}
          >
            ERC-8004 Specs
          </button>
        </div>

        {/* Tab 1: Prompts & Tools */}
        {activeTab === 'tools' && (
          <div className="twitter-tab-panel">
            {/* Quick Action Prompt Chips */}
            <div className="twitter-card-clean">
              <div className="twitter-card-clean-header">
                <Sparkles size={16} color={p.primary} />
                <h3 className="twitter-card-clean-title">Quick Prompts</h3>
              </div>
              <div className="twitter-prompt-chips">
                {spec.prompts.map((item, idx) => (
                  <button 
                    key={idx}
                    type="button" 
                    className="twitter-prompt-chip"
                    onClick={() => openAppChat(item.query)}
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>

            {/* Active Agent Capabilities / Tools */}
            <div className="twitter-card-clean" style={{ marginTop: 14 }}>
              <div className="twitter-card-clean-header">
                <Zap size={16} color="#10b981" />
                <h3 className="twitter-card-clean-title">Autonomous Capabilities</h3>
              </div>
              <div className="twitter-clean-tools-list">
                {spec.tools.map((t, idx) => (
                  <div key={idx} className="twitter-clean-tool-row">
                    <div className="twitter-clean-tool-left">
                      <div className="twitter-clean-tool-head">
                        <code className="twitter-clean-tool-name">{t.name}</code>
                        <span className="twitter-clean-tool-badge">{t.badge}</span>
                      </div>
                      <p className="twitter-clean-tool-desc">{t.desc}</p>
                    </div>
                    <button
                      type="button"
                      className="twitter-clean-tool-run-btn"
                      onClick={() => openAppChat(t.query)}
                    >
                      <span>Run</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pay USDC */}
        {activeTab === 'pay' && (
          <div className="twitter-tab-panel">
            <div className="twitter-pay-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Send USDC to {displayTag}</h3>
                  <span style={{ fontSize: 12.5, color: 'var(--tw-text-muted)' }}>
                    Arc Testnet · Instant Peer Settlement
                  </span>
                </div>
                <span className="twitter-category-badge">Zero Gas</span>
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
                <label className="twitter-input-label">Memo (Optional)</label>
                <input
                  type="text"
                  className="twitter-text-input"
                  value={payMemo}
                  onChange={(e) => setPayMemo(e.target.value)}
                  placeholder="e.g. Payment for API query"
                />
              </div>

              <button
                type="button"
                className="twitter-btn-pay"
                style={{ height: 44, fontSize: 14.5, justifyContent: 'center', marginTop: 8 }}
                onClick={handleExecuteSend}
              >
                {paySuccess ? '✓ Connecting to Wallet…' : `Pay $${payAmount} USDC to ${displayTag}`}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: ERC-8004 Specs */}
        {activeTab === 'onchain' && (
          <div className="twitter-tab-panel">
            <div className="twitter-card-clean">
              <div className="twitter-card-clean-header">
                <ShieldCheck size={16} color="#10b981" />
                <h3 className="twitter-card-clean-title">ERC-8004 Sovereign Credentials</h3>
              </div>
              <div className="twitter-specs-list">
                <div className="twitter-spec-item">
                  <span className="twitter-spec-label">Agent Identity Registry</span>
                  <a 
                    href={`https://explorer.testnet.arc.io/token/${ARC_ERC8004_IDENTITY_REGISTRY}`}
                    target="_blank"
                    rel="noreferrer"
                    className="twitter-spec-value"
                  >
                    <span>{shorten(ARC_ERC8004_IDENTITY_REGISTRY)}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="twitter-spec-item">
                  <span className="twitter-spec-label">Reputation Registry</span>
                  <a 
                    href={`https://explorer.testnet.arc.io/address/${ARC_ERC8004_REPUTATION_REGISTRY}`}
                    target="_blank"
                    rel="noreferrer"
                    className="twitter-spec-value"
                  >
                    <span>{shorten(ARC_ERC8004_REPUTATION_REGISTRY)}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="twitter-spec-item">
                  <span className="twitter-spec-label">Native Settlement Token</span>
                  <a 
                    href={`https://explorer.testnet.arc.io/address/${ARC_USDC_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="twitter-spec-value"
                  >
                    <span>USDC ({shorten(ARC_USDC_ADDRESS)})</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="twitter-spec-item">
                  <span className="twitter-spec-label">Sovereign Agent Wallet</span>
                  <button 
                    type="button" 
                    className="twitter-spec-value" 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={copyAddress}
                  >
                    <span>{shorten(effectiveAddress)}</span>
                    {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
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

            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--tw-text-muted)' }}>
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
                placeholder="Optional memo"
                value={payMemo}
                onChange={(e) => setPayMemo(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="twitter-btn-pay"
              style={{ height: 44, fontSize: 14.5, justifyContent: 'center', marginTop: 8 }}
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

            <div style={{
              margin: '12px auto',
              padding: '16px',
              background: '#ffffff',
              borderRadius: '20px',
              width: 'fit-content',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}&margin=10`}
                alt={`${displayTag} QR Code`}
                style={{ width: 200, height: 200, display: 'block' }}
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
