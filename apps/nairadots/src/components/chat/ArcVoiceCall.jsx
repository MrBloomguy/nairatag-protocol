import { Mic, MicOff, PhoneOff, Volume2, X } from 'lucide-react';
import ProfileAvatar from '../ProfileAvatar.jsx';

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function ArcVoiceCall({ voice, agentTag, agentName, accountEmail }) {
  if (voice.status === 'idle' && !voice.error) return null;
  const phaseLabel = voice.status === 'connecting'
    ? 'Connecting securely…'
    : voice.phase === 'thinking'
      ? 'Your agent is working on that…'
      : voice.phase === 'speaking'
        ? `${agentName || `₦${agentTag || 'agent'}`} is replying…`
        : 'Listening';

  return (
    <div className="arc-voice-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { voice.stop(); voice.clearError(); } }}>
      <section className="arc-voice-call" role="dialog" aria-modal="true" aria-label="Voice call with your agent">
        <div className="arc-voice-call-topline">
          <span><span className={`arc-voice-live-dot ${voice.status === 'active' ? 'is-live' : ''}`} />{voice.status === 'active' ? 'VOICE CALL' : 'VOICE'}</span>
          {voice.status === 'active' && <time>{formatDuration(voice.elapsedSeconds)}</time>}
          <button type="button" className="arc-voice-close" onClick={() => { voice.stop(); voice.clearError(); }} aria-label="Close voice call"><X size={17} /></button>
        </div>
        <div className={`arc-voice-avatar ${voice.phase === 'speaking' ? 'is-speaking' : ''}`}>
          <ProfileAvatar tag={agentTag} email={accountEmail} size={88} />
        </div>
        <h2>{agentName || (agentTag ? `₦${agentTag}` : 'Your agent')}</h2>
        <p className="arc-voice-status">{phaseLabel}</p>
        {voice.error ? (
          <div className="arc-voice-error" role="alert">
            <p>{voice.error}</p>
            <button type="button" onClick={voice.clearError}>Dismiss</button>
          </div>
        ) : (
          <div className="arc-voice-captions" aria-live="polite">
            {voice.inputCaption && <p><span>You</span>{voice.inputCaption}</p>}
            {voice.outputCaption && <p><span>{agentName || 'Agent'}</span>{voice.outputCaption}</p>}
            {!voice.inputCaption && !voice.outputCaption && <p className="arc-voice-hint">Speak naturally. Your requests go through your signed-in NairaTag agent.</p>}
          </div>
        )}
        {voice.status === 'idle' ? (
          <button className="arc-voice-retry" type="button" onClick={voice.retry}><Volume2 size={17} /> Try voice again</button>
        ) : (
          <div className="arc-voice-controls">
            <button type="button" className={`arc-voice-control ${voice.muted ? 'is-muted' : ''}`} onClick={voice.toggleMute} aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'} title={voice.muted ? 'Unmute microphone' : 'Mute microphone'}>
              {voice.muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button type="button" className="arc-voice-end" onClick={voice.stop} aria-label="End voice call"><PhoneOff size={19} /><span>End call</span></button>
          </div>
        )}
        <p className="arc-voice-privacy">Microphone audio streams to Gemini Live during this call.</p>
      </section>
    </div>
  );
}
