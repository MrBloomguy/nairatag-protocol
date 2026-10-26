import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, Sparkles, AudioLines, Globe, Hand, AlertCircle, RefreshCw } from 'lucide-react';
import Orb from './Orb.jsx';
import BarVisualizer from './BarVisualizer.jsx';
import {
  SUPPORTED_AGENT_LANGUAGES,
  getAgentLanguagePreference,
  saveAgentLanguagePreference,
} from '../../services/agentLanguage.js';

export default function ArcVoiceExperience({
  voice,
  agentTag = 'arc',
  agentName = 'NairaTag Agent',
  accountEmail = '',
  walletAddress = '',
  previewMode = false,
  onClose = null,
}) {
  const [selectedLanguage, setSelectedLanguage] = useState(() =>
    getAgentLanguagePreference(walletAddress)
  );
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Sync language with storage
  useEffect(() => {
    if (walletAddress) {
      setSelectedLanguage(getAgentLanguagePreference(walletAddress));
    }
  }, [walletAddress]);

  const handleSelectLanguage = (langCode) => {
    setSelectedLanguage(langCode);
    if (walletAddress) {
      saveAgentLanguagePreference(walletAddress, langCode);
    }
    setIsLangMenuOpen(false);
  };

  if (voice.status === 'idle' && !voice.error) return null;

  const currentPhase = voice.status === 'connecting' ? 'connecting' : (voice.phase || 'listening');

  const phaseConfig = {
    connecting: {
      label: 'Connecting to Gemini Live…',
      badgeClass: 'badge-connecting',
      icon: <Sparkles size={13} className="spin-slow" />,
    },
    listening: {
      label: voice.muted ? 'Microphone Muted' : 'Listening…',
      badgeClass: voice.muted ? 'badge-muted' : 'badge-listening',
      icon: <span className="pulsing-live-dot" />,
    },
    thinking: {
      label: 'Thinking…',
      badgeClass: 'badge-thinking',
      icon: <Sparkles size={13} className="spin-fast" />,
    },
    speaking: {
      label: `${agentName || 'Agent'} is speaking`,
      badgeClass: 'badge-speaking',
      icon: <AudioLines size={13} />,
    },
  }[currentPhase] || {
    label: 'Listening…',
    badgeClass: 'badge-listening',
    icon: <span className="pulsing-live-dot" />,
  };

  const handleEndVoice = () => {
    voice.stop();
    voice.clearError?.();
    if (onClose) onClose();
  };

  const handleInterrupt = () => {
    if (voice.phase === 'speaking') {
      // If voice supports interrupt, trigger it or toggle mute
      if (typeof voice.interrupt === 'function') {
        voice.interrupt();
      }
    }
  };

  const currentLangObj = SUPPORTED_AGENT_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_AGENT_LANGUAGES[0];

  return (
    <div
      className="chatgpt-voice-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Voice conversation with ${agentName}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !previewMode) {
          handleEndVoice();
        }
      }}
    >
      <div className="chatgpt-voice-container">
        {/* ─── 1. Floating Top Navigation Bar ─── */}
        <header className="chatgpt-voice-topbar">
          {/* Left: Agent Chip */}
          <div className="chatgpt-voice-agent-chip">
            <span className="agent-online-dot" />
            <span className="agent-chip-tag">₦{agentTag || 'agent'}</span>
            <span className="agent-chip-name">{agentName}</span>
          </div>

          {/* Center: Dynamic Conversational Status Pill */}
          <div className={`chatgpt-voice-phase-pill ${phaseConfig.badgeClass}`}>
            {phaseConfig.icon}
            <span>{voice.error ? 'Voice paused' : phaseConfig.label}</span>
          </div>

          {/* Right: Language Pill & Exit Button */}
          <div className="chatgpt-voice-top-actions">
            {/* Language Quick-Switcher */}
            <div className="chatgpt-voice-lang-wrapper">
              <button
                type="button"
                className="chatgpt-voice-lang-btn"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                title="Select spoken language"
                aria-label="Select spoken language"
              >
                <Globe size={14} />
                <span>{currentLangObj.nativeName || currentLangObj.name}</span>
              </button>

              {isLangMenuOpen && (
                <div className="chatgpt-voice-lang-dropdown">
                  <div className="chatgpt-voice-lang-dropdown-header">Spoken Language</div>
                  {SUPPORTED_AGENT_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`chatgpt-voice-lang-item ${selectedLanguage === lang.code ? 'is-selected' : ''}`}
                      onClick={() => handleSelectLanguage(lang.code)}
                    >
                      <span className="lang-name">{lang.name}</span>
                      <span className="lang-native">{lang.nativeName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Exit Session Button (No phone vibe, clean minimalist close) */}
            <button
              type="button"
              className="chatgpt-voice-close-btn"
              onClick={handleEndVoice}
              aria-label={previewMode ? 'Close voice preview' : 'Return to chat'}
              title="Return to chat"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ─── 2. Center Stage: ElevenLabs 3D Fluid Orb & Bar Visualizer ─── */}
        <main className="chatgpt-voice-stage">
          <div className="chatgpt-voice-orb-wrapper">
            <Orb
              state={voice.error ? 'idle' : currentPhase}
              volume={voice.audioLevel || (currentPhase === 'speaking' ? 0.35 : currentPhase === 'listening' ? 0.15 : 0)}
              size={290}
              agentTag={agentTag}
              agentName={agentName}
            />
          </div>

          {/* ElevenLabs UI Bar Visualizer */}
          <div className="chatgpt-voice-visualizer-wrapper">
            <BarVisualizer
              state={voice.error ? 'idle' : currentPhase}
              volume={voice.audioLevel || 0}
              frequencyData={voice.frequencyData || null}
              barCount={30}
              maxHeight={44}
              barWidth={3}
              barGap={4}
              onInterrupt={handleInterrupt}
            />
          </div>

          {/* Agent Voice Persona Tagline */}
          <div className="chatgpt-voice-persona-meta">
            <h2>{agentName}</h2>
            <p className="persona-subtitle">
              {currentPhase === 'listening'
                ? 'Listening to you speak…'
                : currentPhase === 'thinking'
                ? 'Processing your request…'
                : currentPhase === 'speaking'
                ? 'Speaking with you…'
                : 'Connecting…'}
            </p>
          </div>

          {/* ─── 3. Real-Time Conversational Transcriptions ─── */}
          <div className="chatgpt-voice-transcription-card">
            {voice.error ? (
              <div className="chatgpt-voice-error-row" role="alert">
                <AlertCircle size={18} />
                <div className="error-copy">
                  <p>{voice.error}</p>
                </div>
                {voice.retry && (
                  <button type="button" className="voice-retry-btn" onClick={voice.retry}>
                    <RefreshCw size={13} />
                    <span>Try again</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="chatgpt-voice-captions-flow" aria-live="polite">
                {voice.inputCaption && (
                  <div className="caption-bubble caption-user">
                    <span className="caption-sender">You</span>
                    <p className="caption-text">“{voice.inputCaption}”</p>
                  </div>
                )}
                {voice.outputCaption && (
                  <div className="caption-bubble caption-agent">
                    <span className="caption-sender">₦{agentTag}</span>
                    <p className="caption-text">{voice.outputCaption}</p>
                  </div>
                )}
                {!voice.inputCaption && !voice.outputCaption && (
                  <p className="chatgpt-voice-hint">
                    Speak naturally. Your agent responds conversationally with Gemini Live.
                  </p>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ─── 4. ChatGPT Voice Mode Floating Bottom Dock ─── */}
        <footer className="chatgpt-voice-dock">
          {/* Mute / Unmute Button */}
          <button
            type="button"
            className={`chatgpt-voice-dock-btn dock-btn-mic ${voice.muted ? 'is-muted' : ''}`}
            onClick={voice.toggleMute}
            aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
            title={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {voice.muted ? <MicOff size={20} /> : <Mic size={20} />}
            <span className="dock-btn-label">{voice.muted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Center: Tap to Interrupt (when speaking) or Mode Status */}
          {currentPhase === 'speaking' ? (
            <button
              type="button"
              className="chatgpt-voice-dock-pill dock-btn-interrupt"
              onClick={handleInterrupt}
              title="Interrupt agent speech"
            >
              <Hand size={15} />
              <span>Tap to interrupt</span>
            </button>
          ) : (
            <div className="chatgpt-voice-dock-pill dock-status-pill">
              <AudioLines size={14} />
              <span>Gemini Live Voice</span>
            </div>
          )}

          {/* End Voice Session Button (Returns to Chat) */}
          <button
            type="button"
            className="chatgpt-voice-dock-btn dock-btn-exit"
            onClick={handleEndVoice}
            aria-label={previewMode ? 'Close preview' : 'Back to chat'}
            title="Return to chat"
          >
            <X size={20} />
            <span className="dock-btn-label">Chat</span>
          </button>
        </footer>

        {/* ─── 5. Developer Interactive Preview Controls (DEV ONLY) ─── */}
        {previewMode && (
          <aside className="chatgpt-voice-preview-toolbar">
            <span className="preview-label">ElevenLabs UI Preview</span>
            <button type="button" onClick={voice.advancePreview}>
              Next State ({currentPhase})
            </button>
            <button type="button" onClick={voice.toggleMute}>
              {voice.muted ? 'Unmute mic' : 'Mute mic'}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
