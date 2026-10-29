import { useEffect, useMemo, useState } from 'react';
import { getOriginalAgentLogo } from '../../services/arcAgents.js';

const DEFAULT_AGENT_AVATAR = 'https://api.dicebear.com/7.x/identicon/svg?seed=arc-agent';
const INTENTS = [
  {
    id: 'food',
    match: /\b(food|eat|meal|restaurant|chowdeck|jollof|lunch|dinner|breakfast)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Checking order', 'Sorting details', 'Getting options ready'],
  },
  {
    id: 'travel',
    match: /\b(ride|travel|transit|trip|driver|pickup|destination|dispatch)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Checking route', 'Planning trip', 'Getting options ready'],
  },
  {
    id: 'contract',
    match: /\b(contract|solidity|audit|bytecode|security|deploy)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Reviewing request', 'Checking details', 'Preparing guidance'],
  },
  {
    id: 'creative',
    match: /\b(design|logo|banner|image|visual|creative|ui|artwork)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Shaping ideas', 'Finding a direction', 'Polishing'],
  },
  {
    id: 'utility',
    match: /\b(airtime|recharge|top.?up|dstv|gotv|electricity|utility|data bundle)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Checking service', 'Sorting details', 'Getting it ready'],
  },
  {
    id: 'payment',
    match: /\b(pay|payment|transfer|send|swap|usdc|balance|wallet|money|cash|naira|₦)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Checking details', 'Preparing transfer', 'Ready to review'],
  },
  {
    id: 'identity',
    match: /\b(claim|tag|profile|address|resolve|identity|username|name)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Checking your tag', 'Looking up details', 'Ready to help'],
  },
  {
    id: 'file',
    match: /\.(pdf|docx?|xlsx?|csv|png|jpe?g|webp|sol)\b/i,
    avatar: DEFAULT_AGENT_AVATAR,
    phases: ['Reading file', 'Finding key details', 'Preparing notes'],
  },
];

const STATUS_COPY = {
  waiting: 'Waiting for your wallet approval',
  transacting: 'Sending your transaction',
  confirming: 'Confirming it on Arc',
};

const GENERAL_INTENT = {
  id: 'general',
  avatar: DEFAULT_AGENT_AVATAR,
  phases: ['Reading', 'Thinking', 'Drafting'],
};

export default function ChatActivityIndicator({ status = 'thinking', prompt = '', agentAvatar = '' }) {
  const intent = useMemo(
    () => INTENTS.find((candidate) => candidate.match.test(prompt)) || GENERAL_INTENT,
    [prompt],
  );
  const [phaseIndex, setPhaseIndex] = useState(0);
  const avatar = agentAvatar || (prompt.includes('@') || prompt.includes('₦') ? getOriginalAgentLogo(prompt) : null) || intent.avatar;
  const isLiveAction = Object.prototype.hasOwnProperty.call(STATUS_COPY, status);
  const label = isLiveAction ? STATUS_COPY[status] : intent.phases[phaseIndex];

  useEffect(() => {
    setPhaseIndex(0);
    if (isLiveAction) return undefined;

    const timer = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % intent.phases.length);
    }, 1150);
    return () => window.clearInterval(timer);
  }, [intent, isLiveAction]);

  return (
    <div className={`chat-activity-indicator is-${status} intent-${intent.id}`} role="status" aria-live="polite">
      <span className="chat-activity-icon-wrap" aria-hidden="true" key={`${intent.id}-${status}`}>
        <img
          className="chat-activity-agent-avatar"
          src={avatar}
          alt=""
          onError={(event) => {
            if (event.currentTarget.src !== DEFAULT_AGENT_AVATAR) event.currentTarget.src = DEFAULT_AGENT_AVATAR;
            else event.currentTarget.style.visibility = 'hidden';
          }}
        />
        {!isLiveAction && <span className="chat-activity-orbit" />}
      </span>
      <span className="chat-activity-label" key={`${status}-${intent.id}-${phaseIndex}`}>
        {label}
      </span>
      {!isLiveAction && (
        <span className="chat-activity-progress" aria-hidden="true">
          {intent.phases.map((_, index) => (
            <span key={index} className={index === phaseIndex ? 'active' : ''} />
          ))}
        </span>
      )}
    </div>
  );
}
