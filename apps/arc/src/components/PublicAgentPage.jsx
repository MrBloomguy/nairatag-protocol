import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Copy, ExternalLink, LoaderCircle, Share2 } from 'lucide-react';
import { getArcTagPublicProfile } from '../services/arcNairaTag.js';
import { resolveTagProfile } from '../services/tagAvatar.js';
import { activeArcChain, ARC_NAIRATAG_REGISTRY_ADDRESS, ARC_NAIRATAG_RESOLVER_ADDRESS } from '../config/arc.js';
import './public-agent-page.css';

const shorten = (address = '') => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

export default function PublicAgentPage({ tag }) {
  const cleanTag = useMemo(() => String(tag || '').replace(/^[₦$@#]/, '').toLowerCase(), [tag]);
  const identity = useMemo(() => resolveTagProfile(cleanTag || 'nairatag', { network: 'arc', avatarSize: 176 }), [cleanTag]);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [copied, setCopied] = useState(false);
  const profileUrl = `${window.location.origin}/agent/${encodeURIComponent(cleanTag)}`;
  const explorerUrl = activeArcChain.blockExplorers.default.url;

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getArcTagPublicProfile(cleanTag)
      .then((result) => { if (active) { setProfile(result); setStatus(result ? 'ready' : 'missing'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [cleanTag]);

  useEffect(() => {
    document.title = `₦${cleanTag.toUpperCase()} · NairaTag on Arc`;
  }, [cleanTag]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { window.prompt('Copy your NairaTag profile link', profileUrl); }
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `₦${cleanTag.toUpperCase()} on NairaTag`, text: `Pay or connect with ₦${cleanTag.toUpperCase()} on Arc.`, url: profileUrl }); }
      catch (error) { if (error.name !== 'AbortError') copyLink(); }
    } else copyLink();
  };

  return (
    <main className="public-agent-page">
      <header className="public-agent-header">
        <a href="/#agents" className="public-agent-brand"><img src="/nairatag-logo.png" alt="" /> <span>NairaTag</span></a>
        <a href="/#agents" className="public-agent-back"><ArrowLeft size={15} /> Explore NairaTag</a>
      </header>

      <section className="public-agent-layout" aria-labelledby="public-agent-title">
        <div className="public-agent-copy">
          <span className="public-agent-eyebrow">NAIRATAG IDENTITY · {activeArcChain.name.toUpperCase()}</span>
          <h1 id="public-agent-title">A name people can trust.</h1>
          <p className="public-agent-intro">This is the public profile for ₦{cleanTag.toUpperCase()}. Share it to make it easy for people to find and pay you.</p>

          {status === 'loading' && <div className="public-agent-notice"><LoaderCircle className="public-agent-spin" size={19} /> Looking up this tag on Arc…</div>}
          {status === 'error' && <div className="public-agent-notice public-agent-error">{!ARC_NAIRATAG_REGISTRY_ADDRESS || !ARC_NAIRATAG_RESOLVER_ADDRESS ? 'NairaTag profiles are not deployed on Arc Mainnet yet. The Mainnet registry and resolver must be deployed before these profiles can be verified here.' : 'We couldn’t reach the Arc registry. Check your connection and reload this page.'}</div>}
          {status === 'missing' && <div className="public-agent-notice public-agent-error">₦{cleanTag.toUpperCase()} hasn’t been claimed yet.</div>}

          {profile && (
            <div className="public-agent-actions">
              <a className="public-agent-primary" href={`/?to=${encodeURIComponent(`₦${cleanTag}`)}#pay`}>Send USDC <ArrowUpRight size={17} /></a>
              <button className="public-agent-secondary" type="button" onClick={shareProfile}><Share2 size={16} /> Share profile</button>
              <button className="public-agent-secondary" type="button" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Link copied' : 'Copy link'}</button>
            </div>
          )}

          <a href={explorerUrl} className="public-agent-network" target="_blank" rel="noreferrer">{profile ? `Verified on ${activeArcChain.name}` : `${activeArcChain.name} explorer`} <ExternalLink size={13} /></a>
        </div>

        <article className="public-id-card" style={{ '--identity-color': identity.palette.primary, '--identity-ink': identity.palette.textOnCard }}>
          <div className="public-id-card-top"><span className="public-id-currency" aria-hidden="true">₦</span><span className="public-id-network"><i /> {activeArcChain.name.toUpperCase()}</span></div>
          <span className="public-id-watermark" aria-hidden="true">N</span>
          <img className="public-id-avatar" src={`data:image/svg+xml,${encodeURIComponent(identity.avatarSvg)}`} alt={`Pixel avatar for ₦${cleanTag.toUpperCase()}`} />
          <div className="public-id-details">
            <h2>₦{cleanTag.toUpperCase()} {profile && <span className="public-id-verified" title="Claim recorded on Arc"><Check size={15} /></span>}</h2>
            <p>{profile ? 'Connected. Verified. Yours.' : 'Public NairaTag profile'}</p>
          </div>
          {profile && <a className="public-id-owner" href={`${explorerUrl}/address/${profile.owner}`} target="_blank" rel="noreferrer" title={profile.owner}>Wallet <span>{shorten(profile.owner)}</span><ExternalLink size={12} /></a>}
        </article>
      </section>

      {profile && <footer className="public-agent-footer">NairaTag makes Arc payments simple. <a href="/#claim">Claim your own tag <ArrowUpRight size={13} /></a></footer>}
    </main>
  );
}
