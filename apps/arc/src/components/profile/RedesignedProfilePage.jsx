import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Share2,
  CheckCircle2,
  ChevronRight,
  Send,
  Settings,
  Grid,
  History,
  Wallet,
  Gift,
  Brain,
  Tag,
  Copy,
  Check,
  ExternalLink,
  User,
  Cpu,
  Globe,
  Sun,
  Moon,
  LogOut,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import ProfileAvatar from '../ProfileAvatar.jsx';
import './redesigned-profile.css';

export default function RedesignedProfilePage({
  walletAddress,
  authProvider,
  accountEmail,
  displayAccountName,
  myTag,
  usdcBalance = { formatted: '0.00' },
  userPoints = 0,
  onSendUsdc,
  onClaimTag,
  onOpenRewards,
  onOpenPersonalAgent,
  onOpenNotifications,
  onDisconnect,
  onRequestConnect,
  onBackToChat,
  recentArcTags = [],
  theme = 'dark',
  toggleTheme,
}) {
  const [view, setView] = useState('overview'); // 'overview' | 'settings'
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' | 'activity'
  const [copied, setCopied] = useState(false);
  const [activeModel, setActiveModel] = useState('Gemini 2.0 Flash');

  const cleanTag = myTag?.tag ? String(myTag.tag).replace(/^[₦$@#]/, '').toUpperCase() : null;
  const displayName = cleanTag ? `₦${cleanTag}` : displayAccountName || (accountEmail ? accountEmail.split('@')[0] : 'Arc Explorer');
  const handleText = cleanTag ? `@${cleanTag.toLowerCase()}` : (accountEmail ? `@${accountEmail.split('@')[0]}` : (walletAddress ? `@${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Guest'));

  const handleCopyWallet = () => {
    if (!walletAddress) return;
    navigator.clipboard?.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const url = cleanTag ? `https://arc.nairatag.ng/tag/${cleanTag.toLowerCase()}` : window.location.origin;
    if (navigator.share) {
      navigator.share({
        title: `${displayName} on NairaTag`,
        text: `Send USDC or connect with ${displayName} on Arc Network.`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If user is not authenticated, show sleek sign-in view
  if (!walletAddress) {
    return (
      <div className="social-profile-root">
        <header className="profile-nav-header">
          <button type="button" className="profile-nav-back-btn" onClick={onBackToChat} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <span className="profile-nav-title">Profile</span>
          <div style={{ width: 40 }} />
        </header>

        <div className="profile-hero-section" style={{ marginTop: 40 }}>
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-ring">
              <div className="profile-avatar-inner" style={{ width: 84, height: 84 }}>
                <User size={38} color="#9CA3AF" />
              </div>
            </div>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0 4px', color: '#ffffff' }}>Your NairaTag Identity</h2>
          <p className="profile-bio-text">Sign in with email or wallet to access your tag, instant USDC payments, and bounties.</p>
          <button
            type="button"
            className="profile-btn-primary"
            style={{ width: '100%', maxWidth: 260, marginTop: 12 }}
            onClick={onRequestConnect}
          >
            Sign in or Create Tag
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: GROUPED SETTINGS (Matching Reference Image 2)
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === 'settings') {
    return (
      <div className="social-profile-root">
        <header className="profile-nav-header">
          <button type="button" className="profile-nav-back-btn" onClick={() => setView('overview')} aria-label="Back to profile">
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ width: 40 }} />
        </header>

        <div className="settings-view-root">
          {/* Top Profile Summary Card (Matching Reference Image 2) */}
          <div className="settings-profile-card">
            <ProfileAvatar tag={myTag?.tag} email={accountEmail} size={54} />
            <div className="settings-profile-info">
              <h2 className="settings-profile-name">{displayName}</h2>
              <div className="settings-profile-sub">{accountEmail || (walletAddress ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}` : 'Arc Account')}</div>
              {cleanTag ? (
                <span className="profile-verified-badge" style={{ fontSize: 11, gap: 4 }}>
                  <ShieldCheck size={12} color="#0052FF" /> Verified ₦Tag
                </span>
              ) : (
                <button type="button" className="settings-edit-link" onClick={onClaimTag}>
                  <Tag size={12} /> Claim a NairaTag
                </button>
              )}
            </div>
          </div>

          {/* Group 1: Account Details (Matching Reference Image 2) */}
          <section className="settings-group">
            <span className="settings-group-title">Account details</span>
            <div className="settings-group-card">
              <button type="button" className="settings-item-row" onClick={cleanTag ? handleCopyWallet : onClaimTag}>
                <div className="settings-item-left">
                  <span className="settings-item-icon"><User size={18} /></span>
                  <span>{cleanTag ? `Tag: ₦${cleanTag}` : 'Claim your NairaTag'}</span>
                </div>
                <div className="settings-item-right">
                  <span>{cleanTag ? 'Active' : 'Get Tag'}</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              <button type="button" className="settings-item-row" onClick={handleCopyWallet}>
                <div className="settings-item-left">
                  <span className="settings-item-icon"><Wallet size={18} /></span>
                  <span>Wallet & Balance</span>
                </div>
                <div className="settings-item-right">
                  <span>${usdcBalance.formatted} USDC</span>
                  {copied ? <Check size={14} color="#10b981" /> : <ChevronRight size={16} />}
                </div>
              </button>
            </div>
          </section>

          {/* Group 2: Preferences / Target (Matching Reference Image 2) */}
          <section className="settings-group">
            <span className="settings-group-title">Preferences</span>
            <div className="settings-group-card">
              <button type="button" className="settings-item-row" onClick={onOpenPersonalAgent}>
                <div className="settings-item-left">
                  <span className="settings-item-icon"><Brain size={18} /></span>
                  <span>Personal AI Agent</span>
                </div>
                <div className="settings-item-right">
                  <span>NairaTag Agent</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              <button
                type="button"
                className="settings-item-row"
                onClick={() => {
                  const models = ['Gemini 2.0 Flash', 'Gemini 2.0 Flash Lite', 'Gemini 1.5 Flash'];
                  const nextIndex = (models.indexOf(activeModel) + 1) % models.length;
                  setActiveModel(models[nextIndex]);
                }}
              >
                <div className="settings-item-left">
                  <span className="settings-item-icon"><Cpu size={18} /></span>
                  <span>Chat AI Model</span>
                </div>
                <div className="settings-item-right">
                  <span>{activeModel}</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              <button type="button" className="settings-item-row" onClick={onOpenRewards}>
                <div className="settings-item-left">
                  <span className="settings-item-icon"><Gift size={18} /></span>
                  <span>Protocol Points</span>
                </div>
                <div className="settings-item-right">
                  <span>{Number(userPoints || 0).toLocaleString()} pts</span>
                  <ChevronRight size={16} />
                </div>
              </button>
            </div>
          </section>

          {/* Group 3: General (Matching Reference Image 2) */}
          <section className="settings-group">
            <span className="settings-group-title">General</span>
            <div className="settings-group-card">
              <button type="button" className="settings-item-row" onClick={onOpenNotifications}>
                <div className="settings-item-left">
                  <span className="settings-item-icon"><Bell size={18} /></span>
                  <span>Notifications</span>
                </div>
                <div className="settings-item-right">
                  <span>Inbox</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              <button type="button" className="settings-item-row" onClick={toggleTheme}>
                <div className="settings-item-left">
                  <span className="settings-item-icon">
                    {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  </span>
                  <span>Theme Mode</span>
                </div>
                <div className="settings-item-right">
                  <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              <a
                href={`https://explorer.arc.io/address/${walletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="settings-item-row"
                style={{ textDecoration: 'none' }}
              >
                <div className="settings-item-left">
                  <span className="settings-item-icon"><Globe size={18} /></span>
                  <span>Arc Explorer</span>
                </div>
                <div className="settings-item-right">
                  <span>Mainnet (5042)</span>
                  <ExternalLink size={14} />
                </div>
              </a>
            </div>
          </section>

          {/* Group 4: Session Sign Out */}
          <section className="settings-group">
            <div className="settings-group-card">
              <button type="button" className="settings-item-row settings-signout-row" onClick={onDisconnect}>
                <div className="settings-item-left">
                  <span className="settings-item-icon"><LogOut size={18} /></span>
                  <span>Sign out</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: SOCIAL PROFILE (Matching Reference Image 1)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="social-profile-root">
      {/* Top Header Bar (Matching Image 1: < Back | Handle | Bell | Share) */}
      <header className="profile-nav-header">
        <button type="button" className="profile-nav-back-btn" onClick={onBackToChat} aria-label="Back">
          <ArrowLeft size={18} />
        </button>

        

        <div style={{ width: 40 }} />
      </header>

      {/* Centered Avatar + Handle (Matching Image 1) */}
      <div className="profile-hero-section">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-ring">
            <div className="profile-avatar-inner" style={{ width: 84, height: 84 }}>
              <ProfileAvatar tag={myTag?.tag} email={accountEmail} size={84} />
            </div>
          </div>
        </div>

        <div className="profile-handle-row">
          <span className="profile-handle-text">{handleText}</span>
          <span className="profile-verified-badge" title="Verified NairaTag Identity on Arc">
            <CheckCircle2 size={18} fill="#0052FF" color="#ffffff" />
          </span>
        </div>

        {/* 3-Column Stats Row (Matching Image 1: clean numbers + labels) */}
        <div className="profile-stats-row">
          <button type="button" className="profile-stat-box" onClick={onSendUsdc}>
            <span className="profile-stat-value">${usdcBalance.formatted}</span>
            <span className="profile-stat-label">USDC</span>
          </button>

          <button type="button" className="profile-stat-box" onClick={onOpenRewards}>
            <span className="profile-stat-value">{Number(userPoints || 0).toLocaleString()}</span>
            <span className="profile-stat-label">Points</span>
          </button>

          <button type="button" className="profile-stat-box" onClick={handleCopyWallet} title="Copy wallet address">
            <span className="profile-stat-value">Arc EVM</span>
            <span className="profile-stat-label">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
          </button>
        </div>

        {/* Action Row: Primary Send Button + Settings Icon Button + Share (Matching Image 1) */}
        <div className="profile-actions-row">
          <button type="button" className="profile-btn-primary" onClick={onSendUsdc}>
            <Send size={15} />
            <span>Send USDC</span>
          </button>

          <button type="button" className="profile-btn-icon" onClick={() => setView('settings')} title="Settings">
            <Settings size={18} />
          </button>

          <button type="button" className="profile-btn-icon" onClick={handleShare} title="Share">
            <Share2 size={18} />
          </button>
        </div>

        {/* Short bio & link pill (Matching Image 1) */}
        <p className="profile-bio-text">
          {cleanTag ? `Official ₦${cleanTag} identity on Arc Osaka. Sub-second settlements.` : 'Claim your personalized NairaTag to send & receive USDC by name.'}
        </p>


      </div>

      {/* Social Segmented Tabs Bar (Matching Image 1: Grid | Activity) */}
      <div className="profile-social-tabs">
        <button
          type="button"
          className={`profile-social-tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <Grid size={18} />
        </button>

        <button
          type="button"
          className={`profile-social-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <History size={18} />
        </button>
      </div>

      {/* Tab Panels */}
      <div className="profile-panel-container">
        {activeTab === 'assets' && (
          <div className="profile-assets-grid">
            {/* Asset 1: USDC */}
            <div className="profile-asset-card" onClick={onSendUsdc} style={{ cursor: 'pointer' }}>
              <div className="profile-asset-card-top">
                <div className="profile-asset-icon-box" style={{ background: 'rgba(0, 82, 255, 0.15)', color: '#0052FF' }}>
                  💵
                </div>
                <span className="profile-asset-name">Arc Native</span>
              </div>
              <span className="profile-asset-val">${usdcBalance.formatted}</span>
              <span className="profile-asset-sub">USDC Gas & Settlement</span>
            </div>

            {/* Asset 2: Protocol Points */}
            <div className="profile-asset-card" onClick={onOpenRewards} style={{ cursor: 'pointer' }}>
              <div className="profile-asset-card-top">
                <div className="profile-asset-icon-box" style={{ background: 'rgba(187, 242, 70, 0.15)', color: '#BBF246' }}>
                  🎁
                </div>
                <span className="profile-asset-name">Rewards</span>
              </div>
              <span className="profile-asset-val">{Number(userPoints || 0).toLocaleString()}</span>
              <span className="profile-asset-sub">Earned Protocol Points</span>
            </div>

            {/* Asset 3: NairaTag Identity */}
            <div className="profile-asset-card" onClick={cleanTag ? handleShare : onClaimTag} style={{ cursor: 'pointer' }}>
              <div className="profile-asset-card-top">
                <div className="profile-asset-icon-box" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
                  ₦
                </div>
                <span className="profile-asset-name">{cleanTag ? 'Owned Tag' : 'Unclaimed'}</span>
              </div>
              <span className="profile-asset-val">{cleanTag ? `₦${cleanTag}` : 'No Tag'}</span>
              <span className="profile-asset-sub">{cleanTag ? 'ERC-8004 Verified' : 'Tap to claim a name'}</span>
            </div>

            {/* Asset 4: Personal Agent */}
            <div className="profile-asset-card" onClick={onOpenPersonalAgent} style={{ cursor: 'pointer' }}>
              <div className="profile-asset-card-top">
                <div className="profile-asset-icon-box" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#EC4899' }}>
                  🤖
                </div>
                <span className="profile-asset-name">Agent</span>
              </div>
              <span className="profile-asset-val">NairaTag</span>
              <span className="profile-asset-sub">Autonomous Assistant</span>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="settings-group-card" style={{ marginTop: 4 }}>
            {recentArcTags && recentArcTags.length > 0 ? (
              recentArcTags.slice(0, 6).map((item, idx) => (
                <div key={idx} className="settings-item-row">
                  <div className="settings-item-left">
                    <span className="settings-item-icon"><Sparkles size={16} color="#BBF246" /></span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>₦{String(item.tag).replace(/^[$₦]/, '').toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>{item.activity === 'used' ? 'Transacted on Arc' : 'Just claimed'}</div>
                    </div>
                  </div>
                  <div className="settings-item-right">
                    <span>Verified</span>
                    <CheckCircle2 size={14} color="#10b981" />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: 13 }}>
                No recent transactions yet. Send USDC to see your activity here.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

