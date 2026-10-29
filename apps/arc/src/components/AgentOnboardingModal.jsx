import React, { useEffect, useRef, useState } from 'react';
import { Check, Circle, ImagePlus, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getArcSessionToken } from '../services/arcSession.js';
import './agent-onboarding.css';

const steps = [
  ['identity', 'Confirm your NairaTag', 20],
  ['avatar', 'Choose your portrait', 20],
  ['personality', 'Choose a personality', 10],
  ['permissions', 'Set agent preferences', 10],
  ['firstInteraction', 'Give your agent its first task', 40],
];
const portraits = [
  ['\u{1F60A}', 'Sunny'], ['\u{1F916}', 'Orbit'], ['\u{1F98A}', 'Cleo'], ['\u{1F43C}', 'Panda'],
];

function readCompressedPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected photo could not be read.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Choose a valid image file.'));
      image.onload = () => {
        const scale = Math.min(1, 640 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function AgentOnboardingModal({ tag, walletAddress, progress, onUpdate, onClose, onComplete }) {
  const [personality, setPersonality] = useState(progress.personality || 'friendly');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selfie, setSelfie] = useState('');
  const [portraitError, setPortraitError] = useState('');
  const [earnedPoints, setEarnedPoints] = useState(0);
  const previousPoints = useRef(progress.points || 0);
  const percent = Math.min(100, progress.points || 0);
  const cleanTag = String(tag || progress.tag || 'NAIRATAG').replace(/^[\u20a6$@#]/, '');

  useEffect(() => { setPersonality(progress.personality || 'friendly'); }, [progress.personality]);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving && !submitting) onClose?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving, submitting]);
  useEffect(() => {
    const before = previousPoints.current;
    const gained = percent - before;
    previousPoints.current = percent;
    if (gained <= 0) return undefined;
    setEarnedPoints(gained);
    const timer = window.setTimeout(() => setEarnedPoints(0), 1800);
    if ([25, 50, 75, 100].some((milestone) => before < milestone && percent >= milestone)) {
      confetti({ particleCount: 70, spread: 55, origin: { y: 0.7 }, zIndex: 1400, colors: ['#5b4fff', '#06b6d4', '#10b981'] });
    }
    return () => window.clearTimeout(timer);
  }, [percent]);

  const finish = async (key, patch = {}) => {
    setSaving(true);
    setPortraitError('');
    try { await onUpdate(patch, [key]); }
    catch (error) { setPortraitError(error.message || 'Setup could not be saved. Please try again.'); }
    finally { setSaving(false); }
  };

  const choosePersonality = async (value) => {
    setPersonality(value);
    await finish('personality', { personality: value });
  };

  const generatePortrait = async () => {
    if (!selfie || !walletAddress) return;
    setSaving(true); setPortraitError('');
    try {
      const token = getArcSessionToken(walletAddress);
      if (!token) throw new Error('Your sign-in has expired. Sign in again to create a portrait.');
      const comma = selfie.indexOf(',');
      const response = await fetch('/api/agent-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ walletAddress, mimeType: 'image/jpeg', image: selfie.slice(comma + 1) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Portrait generation failed.');
      const compact = await readCompressedPhoto(new File([Uint8Array.from(atob(result.image), (char) => char.charCodeAt(0))], 'nairatag-portrait.png', { type: result.mimeType || 'image/png' }));
      await finish('avatar', { avatarData: compact, avatarName: 'Your caricature' });
      setSelfie('');
    } catch (error) { setPortraitError(error.message); }
    finally { setSaving(false); }
  };

  const submitSetup = async () => {
    if (submitting) return;
    setSubmitting(true);
    setPortraitError('');
    try {
      const completedSteps = Object.entries(progress.steps || {}).filter(([, done]) => done).map(([step]) => step);
      const saved = await onUpdate({ submittedAt: Date.now() }, completedSteps);
      setSubmitting(false);
      onComplete({ points: saved?.points ?? percent, progress: saved });
    } catch (error) {
      setPortraitError(error.message || 'Your setup could not be submitted. Please try again.');
      setSubmitting(false);
    }
  };

  return <div className="agent-onboard-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="agent-onboard" role="dialog" aria-modal="true" aria-labelledby="agent-onboard-title">
      <button type="button" className="agent-onboard-close" onClick={onClose} aria-label="Close setup"><X size={16} /></button>
      <div className="agent-onboard-intro">
        <div className="agent-onboard-face" aria-label="Your agent avatar">{progress.avatarData ? <img src={progress.avatarData} alt="Your illustrated agent portrait" /> : progress.avatar || <span className="agent-onboard-avatar-initial">{cleanTag.charAt(0).toUpperCase()}</span>}</div>
        <div className="agent-onboard-intro-copy"><h2 id="agent-onboard-title">Make it yours.</h2><p>Personalize your agent.</p></div>
        <label className="agent-onboard-avatar-upload" title="Upload a selfie to create your portrait" aria-label="Upload a selfie to create your portrait"><ImagePlus size={14} /><span>Upload</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => { setPortraitError(''); try { const file = event.target.files?.[0]; if (file) setSelfie(await readCompressedPhoto(file)); } catch (error) { setPortraitError(error.message); } }} disabled={saving} /></label>
      </div>

      {selfie && <div className="agent-onboard-selfie"><img src={selfie} alt="Selfie preview" /><div><strong>Ready to create your portrait?</strong><span>Your photo is only sent after you choose Create.</span></div><button type="button" onClick={generatePortrait} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button></div>}

      <div className="agent-onboard-progress-card">
        <div className="agent-onboard-progress-heading"><strong>Your onboarding rewards</strong><b>{percent} / 100 Pts{earnedPoints > 0 && <i key={percent}>+{earnedPoints} Pts</i>}</b></div>
        <div className="agent-onboard-track"><span style={{ width: `${percent}%` }} /></div>
      </div>

      <div className="agent-onboard-steps">
        {steps.map(([key, title, points]) => {
          const completed = Boolean(progress.steps?.[key]);
          return <article className={`agent-onboard-step ${completed ? 'is-done' : ''}`} key={key}>
            <div className="agent-onboard-step-icon">{completed ? <Check size={12} /> : <Circle size={13} />}</div>
            <div className="agent-onboard-step-content"><strong>{title}</strong>
              {key === 'avatar' && !completed && <>
                <div className="agent-onboard-choices" aria-label="Choose a starter portrait">{portraits.map(([face, name]) => <button key={name} title={name} aria-label={`Choose ${name}`} onClick={() => finish('avatar', { avatar: face, avatarName: name, avatarData: null })} disabled={saving} className={progress.avatarName === name ? 'selected' : ''}>{face}</button>)}</div>
                <small className="agent-onboard-privacy">Or upload a selfie to make a caricature of you.</small>
              </>}
              {key === 'personality' && !completed && <select value={personality} onChange={(e) => choosePersonality(e.target.value)} disabled={saving}><option value="friendly">Friendly</option><option value="playful">Playful</option><option value="focused">Focused</option><option value="professional">Professional</option></select>}
              {key === 'permissions' && !completed && <label className="agent-onboard-permission"><input type="checkbox" checked={progress.permissions?.memory !== false} onChange={(e) => finish('permissions', { permissions: { ...progress.permissions, memory:e.target.checked } })} disabled={saving} /> Allow the agent to remember preferences I share</label>}
            </div>
            <b className={completed ? '' : 'pending'}>+{points} Pts</b>
          </article>;
        })}
      </div>
      {portraitError && <div className="agent-onboard-error" role="alert">{portraitError}</div>}
      <button type="button" className="agent-onboard-continue" onClick={submitSetup} disabled={saving || submitting}>{submitting ? 'Saving your agent…' : 'Submit'} <span>→</span></button>
    </section>
  </div>;
}
