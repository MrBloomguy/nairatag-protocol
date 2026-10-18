import React, { useEffect, useRef, useState } from 'react';
import { createAvatar } from '../assets/avatar-web.js';
import cubeeDefinition from '../assets/cubee.avatar.json';

const MOODS = [
  { key: 'idle', label: 'Idle 💤' },
  { key: 'working', label: 'Working ⚡' },
  { key: 'thinking', label: 'Thinking 🧠' },
  { key: 'excited', label: 'Excited 🚀' },
  { key: 'happy', label: 'Happy 😊' },
  { key: 'celebrate', label: 'Celebrate 🎉' },
  { key: 'proud', label: 'Proud 👑' }
];

export default function CubeeMascot({
  size = 200,
  initialAnimation = 'idle',
  showControls = false,
  interactive = true,
  speechBubble = null,
  compact = false
}) {
  const containerRef = useRef(null);
  const avatarInstanceRef = useRef(null);
  const [currentMood, setCurrentMood] = useState(initialAnimation);
  const [speech, setSpeech] = useState(speechBubble);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    try {
      const avatar = createAvatar(containerRef.current, {
        definition: cubeeDefinition,
        size: '100%'
      });

      avatarInstanceRef.current = avatar;

      if (initialAnimation && typeof avatar.play === 'function') {
        avatar.play(initialAnimation);
      }
    } catch (err) {
      console.warn('Cubee mascot avatar initialization:', err);
    }

    return () => {
      try {
        if (avatarInstanceRef.current && typeof avatarInstanceRef.current.stop === 'function') {
          avatarInstanceRef.current.stop();
        }
      } catch {}
    };
  }, []);

  const handlePlayAnimation = (key, customSpeech) => {
    setCurrentMood(key);
    if (avatarInstanceRef.current && typeof avatarInstanceRef.current.play === 'function') {
      avatarInstanceRef.current.play(key);
    }
    if (customSpeech) {
      setSpeech(customSpeech);
    }
  };

  const handleContainerClick = () => {
    if (!interactive) return;
    const nextMoods = ['excited', 'celebrate', 'happy', 'working', 'proud', 'thinking'];
    const randomMood = nextMoods[Math.floor(Math.random() * nextMoods.length)];
    const messages = {
      excited: "Ready to settle on Celo Sepolia!",
      celebrate: "Bounty verified & payout released! 🎉",
      happy: "Zero gas friction with CIP-64 stablecoins!",
      working: "Monitoring cross-border DEX spread...",
      proud: "Multi-country agent identities for all!",
      thinking: "Verifying EIP-712 PermissionGrant..."
    };
    handlePlayAnimation(randomMood, messages[randomMood]);
  };

  return (
    <div className={`cubee-mascot-wrapper ${compact ? 'compact' : ''}`}>
      {speech && (
        <div className="cubee-speech-bubble">
          <span>{speech}</span>
          <button 
            className="cubee-bubble-close"
            onClick={(e) => { e.stopPropagation(); setSpeech(null); }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="cubee-avatar-stage"
        onClick={handleContainerClick}
        title={interactive ? "Click me to see Cubee react!" : "Cubee • CeloTags Mascot"}
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
          cursor: interactive ? 'pointer' : 'default'
        }}
      />
    </div>
  );
}
