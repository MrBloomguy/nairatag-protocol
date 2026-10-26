import React, { useState, useEffect } from 'react';
import { Plus, Mic, MicOff, X, SlidersHorizontal, Check } from 'lucide-react';
import {
  AGENT_LANGUAGES,
  getAgentLanguagePreference,
  saveAgentLanguagePreference,
} from '../../services/agentLanguage.js';
import '../voice/ArcVoiceExperience.css';

export default function ArcVoiceCall({
  voice,
  agentTag = 'arc',
  agentName = 'ChatGPT',
  accountEmail = '',
  walletAddress = '',
  previewMode = false,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() =>
    getAgentLanguagePreference(walletAddress)
  );

  useEffect(() => {
    if (walletAddress) {
      setSelectedLanguage(getAgentLanguagePreference(walletAddress));
    }
  }, [walletAddress]);

  const handleSelectLanguage = (langValue) => {
    setSelectedLanguage(langValue);
    if (walletAddress) {
      saveAgentLanguagePreference(walletAddress, langValue);
    }
    setIsSettingsOpen(false);
  };

  if (voice.status === 'idle' && !voice.error) return null;

  const currentPhase = voice.status === 'connecting'
    ? 'connecting'
    : (voice.phase || 'listening');

  const handleEndVoice = () => {
    voice.stop();
    voice.clearError?.();
  };

  // Subtle volume reactivity
  const currentVolume = voice.audioLevel
    ? voice.audioLevel
    : currentPhase === 'speaking'
    ? 0.32
    : currentPhase === 'listening'
    ? 0.14
    : 0;

  const dynamicScale = 1 + Math.min(currentVolume * 0.22, 0.12);
  const phaseClass = voice.muted ? 'phase-muted' : `phase-${currentPhase}`;

  return (
    <div
      className={`arc-voice-backdrop ${phaseClass}`}
      role="dialog"
      aria-modal="true"
      aria-label="ChatGPT Voice Mode"
    >
      {/* Centered Responsive Stage for Mobile & Desktop */}
      <div className="arc-voice-chatgpt-stage">
        {/* ─── 1. TOP BAR ─── */}
        <header className="arc-voice-chatgpt-topbar">
          {/* Left: Two-bar menu icon button */}
          <button
            type="button"
            className="arc-voice-icon-btn"
            onClick={handleEndVoice}
            aria-label="Menu"
            title="Return to chat"
          >
            <div className="arc-voice-two-bars">
              <span />
              <span />
            </div>
          </button>

          {/* Right: Sliders / Settings icon button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="arc-voice-icon-btn"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              aria-label="Settings"
              title="Voice & Language Settings"
            >
              <SlidersHorizontal size={18} />
            </button>

            {isSettingsOpen && (
              <div className="arc-voice-settings-popover">
                <div className="arc-voice-settings-header">Spoken Language</div>
                {AGENT_LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    className={`arc-voice-settings-item ${
                      selectedLanguage === lang.value ? 'is-selected' : ''
                    }`}
                    onClick={() => handleSelectLanguage(lang.value)}
                  >
                    <span>{lang.label}</span>
                    {selectedLanguage === lang.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ─── 2. CENTER STAGE (ChatGPT Living Violet Fluid Orb) ─── */}
        <main className="arc-voice-chatgpt-center">
          <div
            className="arc-voice-chatgpt-orb"
            onClick={() => {
              if (currentPhase === 'speaking' && typeof voice.advancePreview === 'function') {
                voice.advancePreview();
              }
            }}
            title={currentPhase === 'speaking' ? 'Click to interrupt' : undefined}
          >
            <div
              className="arc-voice-chatgpt-orb-aura"
              style={{ transform: `scale(${dynamicScale})` }}
            />
            <div
              className="arc-voice-chatgpt-orb-sphere"
              style={{ transform: `scale(${dynamicScale})` }}
            />
          </div>
        </main>

        {/* ─── 3. BOTTOM BAR (+ Ask ChatGPT, Mic Toggle, Solid White Close) ─── */}
        <footer className="arc-voice-chatgpt-bottom-wrap">
          <div className="arc-voice-chatgpt-bottombar">
            {/* Left: "+ Ask ChatGPT" pill button */}
            <button
              type="button"
              className="arc-voice-chatgpt-input-pill"
              onClick={handleEndVoice}
              aria-label={`Ask ${agentName || 'ChatGPT'}`}
            >
              <Plus size={18} />
              <span>Ask {agentName ? agentName.replace(/^₦/, '') : 'ChatGPT'}</span>
            </button>

            {/* Middle: Microphone Button (Outlineless circular) */}
            <button
              type="button"
              className="arc-voice-chatgpt-mic-btn"
              onClick={voice.toggleMute}
              aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
              title={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {voice.muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Right: Solid White Close Button (Outlineless circular) */}
            <button
              type="button"
              className="arc-voice-chatgpt-close-btn"
              onClick={handleEndVoice}
              aria-label="Close voice mode"
              title="Close voice mode"
            >
              <X size={22} strokeWidth={2.4} />
            </button>
          </div>

          {/* ─── 4. PREVIEW STATE CONTROLS (Dev/Preview Only) ─── */}
          {previewMode && (
            <aside className="arc-voice-chatgpt-preview-bar">
              {['listening', 'thinking', 'speaking'].map((phaseKey) => (
                <button
                  key={phaseKey}
                  type="button"
                  className={`arc-voice-chatgpt-preview-btn ${
                    currentPhase === phaseKey ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    if (typeof voice.setPreviewPhase === 'function') {
                      voice.setPreviewPhase(phaseKey);
                    } else if (typeof voice.advancePreview === 'function') {
                      voice.advancePreview();
                    }
                  }}
                >
                  {phaseKey.charAt(0).toUpperCase() + phaseKey.slice(1)}
                </button>
              ))}
              <button
                type="button"
                className={`arc-voice-chatgpt-preview-btn ${voice.muted ? 'is-active' : ''}`}
                onClick={voice.toggleMute}
              >
                {voice.muted ? 'Unmute' : 'Mute'}
              </button>
            </aside>
          )}
        </footer>
      </div>
    </div>
  );
}
