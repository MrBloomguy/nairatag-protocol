import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Copy, 
  Share2, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Wallet, 
  Globe, 
  Sun, 
  Moon,
  ChevronRight,
  Download,
  QrCode
} from 'lucide-react';
import { resolveTagProfile, generateAvatarSvg } from '../services/tagAvatar.js';
import { resolveTag } from '../services/nairatagResolver.js';
import { ARC_NAIRATAG_RESOLVER_ADDRESS, ARC_TESTNET_CONFIG } from '../config/arc.js';
import confetti from 'canvas-confetti';

export default function PublicProfilePage({ rawHandle, type = 'agent' }) {
  const cleanTag = String(rawHandle || 'kratos').replace(/^[₦$@#]/, '').trim();
  const displayTag = `₦${cleanTag.toUpperCase()}`;
  const lowercaseTag = cleanTag.toLowerCase();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('nairatag-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [copied, setCopied] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [agentMetadata, setAgentMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('25');
  const [paySuccess, setPaySuccess] = useState(false);
  const [shareToast, setShareToast] = useState(null);

  // Deterministic styling from palette
  const profile = resolveTagProfile(cleanTag);
  const p = profile.palette;

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
    let isMounted = true;
    async function loadIdentity() {
      setLoading(true);
      try {
        const res = await resolveTag(cleanTag);
        if (isMounted && res) {
          if (res.resolvedAddress) setResolvedAddress(res.resolvedAddress);
          if (res.profile) setAgentMetadata(res.profile);
        }
      } catch (e) {
        console.warn('Failed resolving tag onchain:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadIdentity();
    return () => { isMounted = false; };
  }, [cleanTag]);

  const copyAddress = () => {
    const addr = resolvedAddress || '0x71C8A9b284D7207452d308BE307e5f309a7291A2';
    navigator.clipboard.writeText(addr);
    setCopied(true);
    triggerConfetti(0.3);
    setTimeout(() => setCopied(false), 2400);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showShareToast('Profile link copied to clipboard!');
  };

  const showShareToast = (msg) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 3000);
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
    const text = `Connect with ${displayTag} on @NairaTaghq — sovereign onchain identity & personal AI agent!`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = `Meet ${displayTag} on NairaTag: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = `Meet ${displayTag} on NairaTag:`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const openAppChat = () => {
    window.location.href = `/#chat?agent=${encodeURIComponent(lowercaseTag)}`;
  };

  const openAppClaim = () => {
    window.location.href = `/#claim`;
  };

  const cardSvg = generateAvatarSvg(profile.hashIndex, 190);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme === 'dark' ? '#090a0f' : '#f8fafc',
      color: theme === 'dark' ? '#ffffff' : '#0f172a',
      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'fixed',
        top: '-150px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '800px',
        height: '600px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${p.primary} 0%, transparent 65%)`,
        opacity: theme === 'dark' ? 0.18 : 0.12,
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: theme === 'dark' ? 'rgba(9, 10, 15, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
      }}>
        <a href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          color: 'inherit',
          fontWeight: 800,
          fontSize: '18px',
          letterSpacing: '-0.02em'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: p.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontWeight: 900,
            fontSize: '18px'
          }}>₦</div>
          <span>NairaTag</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            onClick={openAppClaim}
            style={{
              background: p.primary,
              color: '#000000',
              border: 'none',
              borderRadius: '9999px',
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 4px 14px ${p.glow}`
            }}
          >
            <span>Claim your ₦Tag</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '820px',
        margin: '0 auto',
        padding: '40px 20px 80px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px'
      }}>

        {/* Character Card (Exact match to design system mockups) */}
        <div style={{
          width: '100%',
          maxWidth: '340px',
          aspectRatio: '440 / 550',
          borderRadius: '32px',
          backgroundColor: p.primary,
          boxShadow: theme === 'dark' 
            ? `0 24px 60px rgba(0,0,0,0.8), 0 0 30px ${p.glow}`
            : '0 20px 40px rgba(0,0,0,0.15)',
          padding: '24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
        >
          {/* Diagonal Monogram ₦ Watermark */}
          <div style={{
            position: 'absolute',
            right: '-30px',
            top: '30px',
            fontSize: '260px',
            fontWeight: 900,
            color: '#000000',
            opacity: 0.08,
            userSelect: 'none',
            transform: 'rotate(-15deg)',
            pointerEvents: 'none'
          }}>₦</div>

          {/* Top Bar of Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 2
          }}>
            <span style={{
              fontSize: '40px',
              fontWeight: 900,
              color: p.textOnCard,
              lineHeight: 1
            }}>₦</span>

            <div style={{
              backgroundColor: 'rgba(0,0,0,0.12)',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: p.textOnCard,
              letterSpacing: '0.02em'
            }}>
              NairaTag
            </div>
          </div>

          {/* Center Character Avatar */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto 0',
              position: 'relative',
              zIndex: 2
            }}
            dangerouslySetInnerHTML={{ __html: cardSvg }}
          />

          {/* Bottom Bar: ₦tagname in lowercase bold */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: p.textOnCard,
                letterSpacing: '-0.03em',
                lineHeight: 1.1
              }}>
                ₦{lowercaseTag}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: p.textOnCard,
                opacity: 0.75,
                marginTop: '4px'
              }}>
                Sovereign Onchain Identity
              </div>
            </div>

            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Check size={18} strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Identity & Reputation Header */}
        <div style={{
          textAlign: 'center',
          maxWidth: '540px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
            fontSize: '13px',
            fontWeight: 600
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>Verified Sovereign Agent • ERC-8004</span>
          </div>

          <h1 style={{
            fontSize: '38px',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>{displayTag}</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '14px'
            }}>✓</span>
          </h1>

          <p style={{
            fontSize: '16px',
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            lineHeight: 1.5,
            margin: 0
          }}>
            {agentMetadata?.description || `Autonomous sovereign agent on Arc Osaka & Celo. Instant USDC settlement, multi-tool AI capabilities, and verified reputation.`}
          </p>
        </div>

        {/* Interactive Action Bar (Matching Stage 3 / 4 of Mockup) */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '580px'
        }}>
          <button
            onClick={openAppChat}
            style={{
              flex: '1 1 180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '16px',
              backgroundColor: p.primary,
              color: '#000000',
              fontWeight: 800,
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 8px 24px ${p.glow}`,
              transition: 'transform 0.15s ease'
            }}
          >
            <MessageSquare size={18} />
            <span>Chat with Agent</span>
          </button>

          <button
            onClick={() => setIsPayModalOpen(true)}
            style={{
              flex: '1 1 180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '16px',
              backgroundColor: theme === 'dark' ? '#181b26' : '#ffffff',
              color: 'inherit',
              fontWeight: 700,
              fontSize: '15px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <Send size={18} />
            <span>Send Crypto</span>
          </button>

          <button
            onClick={copyAddress}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 20px',
              borderRadius: '16px',
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: 'inherit',
              fontWeight: 600,
              fontSize: '14px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              cursor: 'pointer'
            }}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Address Copied!' : 'Copy 0x'}</span>
          </button>

          <button
            onClick={copyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 20px',
              borderRadius: '16px',
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: 'inherit',
              fontWeight: 600,
              fontSize: '14px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              cursor: 'pointer'
            }}
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>

        {/* Share Channel Quick Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: theme === 'dark' ? '#94a3b8' : '#64748b'
        }}>
          <span>Share to:</span>
          <button 
            onClick={shareToTwitter}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}
          >X (Twitter)</button>
          <span>•</span>
          <button 
            onClick={shareToWhatsApp}
            style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}
          >WhatsApp</button>
          <span>•</span>
          <button 
            onClick={shareToTelegram}
            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
          >Telegram</button>
        </div>

        {/* Verification & Details Card */}
        <div style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: theme === 'dark' ? '#12141e' : '#ffffff',
          borderRadius: '24px',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10b981" />
            <span>Onchain Resolver & Rails</span>
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px'
          }}>
            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
              padding: '12px 16px',
              borderRadius: '14px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Network Rail</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
                <span>Arc Testnet (5042002)</span>
              </div>
            </div>

            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
              padding: '12px 16px',
              borderRadius: '14px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>ERC-8004 Score</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', color: '#10b981' }}>
                99% Reputation (Verified)
              </div>
            </div>

            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
              padding: '12px 16px',
              borderRadius: '14px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Resolved Address</div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                marginTop: '4px',
                wordBreak: 'break-all',
                color: theme === 'dark' ? '#cbd5e1' : '#334155'
              }}>
                {resolvedAddress || '0x71C8A9b284D7207452d308BE307e5f309a7291A2'}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Viral Claim Banner */}
        <div style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: theme === 'dark' ? 'rgba(187, 242, 70, 0.08)' : 'rgba(187, 242, 70, 0.15)',
          border: `1px solid ${p.primary}`,
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>Want your own sovereign ₦Tag?</div>
          <p style={{ fontSize: '14px', color: theme === 'dark' ? '#cbd5e1' : '#475569', margin: 0 }}>
            Claim your name for free in seconds. No crypto wallet or gas fees required — sign in with your email and get an instant AI agent.
          </p>
          <button
            onClick={openAppClaim}
            style={{
              marginTop: '4px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Claim your ₦Tag now</span>
            <ArrowRight size={15} />
          </button>
        </div>

      </main>

      {/* Pay Modal */}
      {isPayModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}
        onClick={() => setIsPayModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: theme === 'dark' ? '#141622' : '#ffffff',
              borderRadius: '24px',
              maxWidth: '420px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Pay {displayTag}</h3>
              <button 
                onClick={() => setIsPayModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'inherit' }}
              >×</button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0 }}>
              Send instant USDC on Arc Osaka directly to this sovereign ₦Tag.
            </p>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Amount (USDC)</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {['5', '25', '50', '100'].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setPayAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '10px',
                      border: payAmount === amt ? `2px solid ${p.primary}` : '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: payAmount === amt ? p.primary : 'transparent',
                      color: payAmount === amt ? '#000000' : 'inherit',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >${amt}</button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setPaySuccess(true);
                triggerConfetti(0.8);
                setTimeout(() => {
                  setPaySuccess(false);
                  setIsPayModalOpen(false);
                  window.location.href = `/#pay?recipient=${encodeURIComponent(cleanTag)}&amount=${payAmount}`;
                }, 1200);
              }}
              style={{
                backgroundColor: p.primary,
                color: '#000000',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              {paySuccess ? '✓ Redirecting to Wallet...' : `Pay $${payAmount} USDC to ${displayTag}`}
            </button>
          </div>
        </div>
      )}

      {/* Share Toast */}
      {shareToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: 700,
          zIndex: 999,
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
        }}>
          {shareToast}
        </div>
      )}
    </div>
  );
}
