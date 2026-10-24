import React, { useEffect, useState } from 'react';
import { Award, Brain, MessageCircle, Mic, ListTodo, Search, Zap, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import './agent-onboarding.css';
import './agent-success.css';

export default function AgentSuccessModal({ tag, progress = {}, variant = 'completed', onClose, onContinue, onMeet, onEarnRewards }) {
  const cleanTag = String(tag || progress.tag || 'NAIRATAG').replace(/^[\u20a6$@#]/, '');
  const isClaim = variant === 'claimed';
  const points = Math.min(100, Math.max(0, Number(progress.points) || 0));
  const [animatedPoints, setAnimatedPoints] = useState(isClaim ? 0 : points);
  // Starter emoji are not a personal identity portrait. Keep success states
  // personal by showing a generated/uploaded portrait or the tag initial.
  const avatar = progress.avatarData || (typeof progress.avatar === 'string' && /^(https?:|data:)/.test(progress.avatar) ? progress.avatar : null);

  useEffect(() => {
    if (!isClaim || points <= 0) {
      setAnimatedPoints(points);
      return undefined;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedPoints(points);
      return undefined;
    }
    const startedAt = performance.now();
    let frameId;
    const animate = (now) => {
      const progressRatio = Math.min(1, (now - startedAt) / 1100);
      const eased = 1 - Math.pow(1 - progressRatio, 3);
      setAnimatedPoints(Math.round(points * eased));
      if (progressRatio < 1) frameId = window.requestAnimationFrame(animate);
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [isClaim, points]);

  useEffect(() => {
    const options = { zIndex: 1600, disableForReducedMotion: true, colors: ['#5b4fff', '#06b6d4', '#10b981', '#f6c453', '#f472b6'] };
    confetti({ ...options, particleCount: isClaim ? 90 : 160, spread: 90, startVelocity: 34, origin: { x: 0.5, y: 0.06 } });
    const left = window.setTimeout(() => confetti({ ...options, particleCount: 55, angle: 58, spread: 58, origin: { x: 0, y: 0.35 } }), 180);
    const right = window.setTimeout(() => confetti({ ...options, particleCount: 55, angle: 122, spread: 58, origin: { x: 1, y: 0.35 } }), 320);
    return () => { window.clearTimeout(left); window.clearTimeout(right); };
  }, [isClaim]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="agent-onboard-backdrop agent-success-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section className="agent-onboard agent-success-modal" role="dialog" aria-modal="true" aria-labelledby="agent-success-title">
      <button type="button" className="agent-onboard-close" onClick={() => onClose?.()} aria-label="Close success message"><X size={20} /></button>
      <div className="agent-success-avatar-wrap">
        <div className="agent-success-avatar" aria-label={avatar ? 'Your agent portrait' : 'NairaTag agent'}>
          {avatar ? (String(avatar).startsWith('data:') || String(avatar).startsWith('http')
            ? <img src={avatar} alt="Your agent portrait" />
            : <span>{avatar}</span>) : <span className="agent-success-initial">{isClaim ? '\u20a6' : cleanTag.charAt(0).toUpperCase()}</span>}
        </div>
        <img className="agent-success-avatar-badge" src="/verified-badge.png" alt="Verified NairaTag agent" />
      </div>
      <p className="agent-success-eyebrow">{isClaim ? 'TAG CLAIMED' : 'AGENT SETUP COMPLETE'}</p>
      <h2 id="agent-success-title">{isClaim ? `\u20a6${cleanTag} is yours!` : `\u20a6${cleanTag} is ready!`}</h2>
      {isClaim && points > 0 && <div className="agent-success-earned-points" aria-live="polite" aria-label={`You earned ${points} points`}><Award size={18} aria-hidden="true" /><strong>+{animatedPoints}</strong><span>Pts earned</span></div>}
      {!isClaim && <p className="agent-success-copy">{points === 100
          ? `You and \u20a6${cleanTag} completed the 100 Pts welcome reward.`
          : `Your setup is saved. Give \u20a6${cleanTag} its first task to unlock the remaining points.`}</p>}
      {isClaim ? <div className="agent-success-features" aria-label={`What NairaTag ${cleanTag} can do`}>
        <div className="agent-success-feature"><MessageCircle aria-hidden="true" /><span>Talk through ideas</span></div>
        <div className="agent-success-feature"><ListTodo aria-hidden="true" /><span>Help with tasks</span></div>
        <div className="agent-success-feature"><Mic aria-hidden="true" /><span>Speak and listen</span></div>
        <div className="agent-success-feature"><Brain aria-hidden="true" /><span>Remember what matters</span></div>
        <div className="agent-success-feature"><Award aria-hidden="true" /><span>Earn as you go</span></div>
        <div className="agent-success-feature"><Search aria-hidden="true" /><span>Find answers</span></div>
        <div className="agent-success-feature"><Zap aria-hidden="true" /><span>Work in the background</span></div>
      </div> : <div className="agent-onboard-success-reward"><strong>{points} / 100 Pts</strong><span>{points === 100 ? 'Welcome reward complete' : `+${100 - points} Pts after the first task`}</span></div>}
      <div className="agent-success-actions">
        {isClaim ? <>
          <button type="button" className="agent-onboard-continue" onClick={() => onMeet?.()}>{`Meet \u20a6${cleanTag}`} <span aria-hidden="true">→</span></button>
          <button type="button" className="agent-success-rewards-button" onClick={() => onEarnRewards?.()}>Earn more rewards</button>
        </> : <button type="button" className="agent-onboard-continue" onClick={() => onContinue?.()}>{`Meet \u20a6${cleanTag}`} <span aria-hidden="true">→</span></button>}
      </div>
    </section>
  </div>;
}
