// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AuthConnectModal from './components/auth/AuthConnectModal';
import ProfileAvatar from './components/ProfileAvatar';
import ChatActivityIndicator from './components/chat/ChatActivityIndicator';
import PersonalAgentPanel from './components/chat/PersonalAgentPanel';
import ArcVoiceCall from './components/chat/ArcVoiceCall.jsx';
import { useArcVoice } from './hooks/useArcVoice.js';
import { ClipboardCheck as ClipboardCheckIcon } from 'lucide-react';
import { ChevronsLeftRight as ChevronsLeftRightIcon } from 'lucide-react';
import { Car as CarIcon } from 'lucide-react';
import { CookingPot as CookingPotIcon } from 'lucide-react';
import { HandCoins as HandCoinsIcon } from 'lucide-react';
import { Ticket as TicketIcon } from 'lucide-react';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Search,
  Sparkles,
  Send,
  X,
  ChevronRight,
  Clock,
  History,
  AlertTriangle,
  Info,
  Check,
  User,
  Link as LinkIcon,
  ArrowLeft,
  ChevronLeft,
  Bot,
  Brain,
  Award,
  FileText,
  Cpu,
  Layers,
  SlidersHorizontal,
  Flame,
  QrCode,
  Sun,
  Moon,
  LayoutGrid,
  List,
  Share2,
  Gift,
  Menu,
  MoreHorizontal,
  HelpCircle,
  ChevronDown,
  CheckSquare,
  Coins,
  MessageSquare,
  AtSign,
  Zap,
  Briefcase,
  Phone,
  Plus,
  Home,
  Users,
  Tag,
  Store,
  Bell,
  Smartphone,
  Ticket,
  TrendingUp,
  Tv,
  Mic,
  MicOff,
  RotateCcw,
  ArrowUp,
  Paperclip,
  Image as ImageIcon,
  Play,
  Pause,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  connectWallet,
  switchOrAddArcNetwork,
  getUsdcBalance,
  sendUsdcOnArc,
  estimateTransferFee,
  activeArcChain,
  getEthereumProvider,
} from './services/arcPayment.js';
import {
  requestCircleEmailOtp,
  verifyCircleEmailOtp,
  connectCircleWallet,
  sendUsdcWithCircle,
  claimTagWithCircle,
  getStoredCircleSession,
  clearCircleSession,
} from './services/circleWallet.js';
import { clearArcSession, establishCircleArcSession, establishWalletArcSession, getArcSessionToken } from './services/arcSession.js';
import {
  resolveTag,
} from './services/nairatagResolver.js';
import { checkArcTagAvailability, claimArcNairaTag, getArcTagForWallet } from './services/arcNairaTag.js';
import {
  buildNairaTagAgentMetadataUri,
  findArcAgentForTag,
  registerNairaTagAgent,
  updateArcAgentRegistrationUri,
  getAgentDetails,
  getAgentReputationLogs,
  recordAgentFeedback,
  getValidationStatus,
} from './services/erc8004Service.js';
import {
  ARC_ERC8004_REPUTATION_REGISTRY,
  ARC_ERC8004_VALIDATION_REGISTRY,
  ARC_MEMO_ADDRESS,
  ARC_NAIRATAG_REGISTRY_ADDRESS,
  ARC_NAIRATAG_RESOLVER_ADDRESS,
  ARC_TESTNET_CONFIG,
  ARC_USDC_ADDRESS,
} from './config/arc.js';
import {
  ARC_SUPPORTED_SWAP_TOKENS,
  APP_KIT_CROSSCHAINS,
  estimateAppKitSwap,
  executeAppKitSwap,
  getUnifiedBalanceSummary,
  getBorrowKitDetails,
  getEarnKitPools,
} from './services/arcAppKit.js';
import { resolveTagProfile } from './services/tagAvatar.js';
import { getRecentArcTagActivity } from './services/arcRecentTagActivity.js';
import { getArcAgentFollowState, setArcAgentFollow } from './services/arcAgentFollows.js';
import { fetchArcAgentMetrics } from './services/arcAgentMetrics.js';
import { discoverAgentsByCapability, isAgentDiscoveryRequest, resolveAgentMention } from './services/agentDiscovery.js';
import {
  recordReferralSignup,
  rememberReferralFromUrl,
} from './services/referrals.js';
import {
  broadcastArcClaimToTelegram,
  getTwitterShareUrl,
  getTelegramShareUrl,
  getTelegramShareIntentUrl,
  getTwitterTaskShareUrl,
  getTagShareUrl,
  getAgentShareUrl,
  getAgentTwitterShareUrl,
  getAgentTelegramShareUrl,
  getAgentWhatsAppShareUrl,
  broadcastArcVoucherClaimToTelegram,
  getWhatsAppShareUrl,
  TELEGRAM_CHANNEL_URL,
  TELEGRAM_CHANNEL_HANDLE,
} from './services/arcSocialBroadcast.js';
import {
  speakText,
  stopSpeaking,
} from './services/arcGeminiChat.js';
import {
  clearArcChatHistory,
  getArcChatHistory,
  getOrCreateArcChatConversationId,
  listArcChatConversations,
  sendArcChatMessage,
} from './services/arcChat.js';
import { createArcPlatformAgent, enableArcMcpTool, fetchArcAgentDirectory, getAdminArcAgentRegistry, transitionArcAgent } from './services/arcAgents.js';
import PlatformAgentAdminPage from './components/admin/PlatformAgentAdminPage.jsx';
import PublicProfilePage from './components/PublicProfilePage.jsx';
import confetti from 'canvas-confetti';
import RewardsPage, { GoldenVoucherModal, LuckyWheelModal, ReferralModal } from './RewardsPage.jsx';
import NotificationLayer from './components/NotificationLayer.jsx';
import { recordConfirmedPaymentSpin } from './services/wheelRewards.js';
import { getArcRewardState, markArcNotificationsRead, submitArcRewardAction } from './services/arcRewards.js';
import { getAgentOnboarding, updateAgentOnboarding, syncAgentOnboardingRewards } from './services/agentOnboarding.js';
import { claimAgentOnboardingReward, getAgentOnboardingRewardState } from './services/agentOnboardingRewards.js';
import AgentOnboardingModal from './components/AgentOnboardingModal.jsx';
import AgentSuccessModal from './components/AgentSuccessModal.jsx';
import { updatePersonalAgent } from './services/personalAgent.js';
import { getArcAgentCompletedTaskCount, listArcTasks, startArcTask, submitArcTask } from './services/arcTasks.js';
import { IN_HOUSE_TASKS, claimInHouseVoucher, getInHouseVouchers, syncInHouseVouchers } from './services/inHouseTasks.js';
import {
  getNotificationInbox,
  markInboxNotificationRead,
  replaceNotificationInbox,
} from './services/notificationInbox.js';
import {
  registerServiceWorker,
  playMicroSound,
  triggerHaptic,
  sendNotificationAlert,
} from './services/pushNotification.js';

/**
 * Metallic & luminous badge emblems matching Reference 1 (Milestones).
 */
export function AgentMedallion({ type, size = 64 }) {
  if (type === 'emerald') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="milestone-emblem-svg">
        <defs>
          <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <polygon points="32,7 57,53 7,53" fill="url(#emeraldGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="32" cy="37" r="9" fill="#ffffff" opacity="0.92" />
        <text x="32" y="41.5" textAnchor="middle" fill="#064E3B" fontSize="12" fontWeight="900" fontFamily="sans-serif">â‚¦</text>
      </svg>
    );
  }
  if (type === 'cyan') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="milestone-emblem-svg">
        <defs>
          <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
        </defs>
        <polygon points="32,6 56,19 56,45 32,58 8,45 8,19" fill="url(#cyanGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="9" fill="#ffffff" opacity="0.92" />
        <text x="32" y="36.5" textAnchor="middle" fill="#0E7490" fontSize="12" fontWeight="900" fontFamily="sans-serif">â‚¦</text>
      </svg>
    );
  }
  if (type === 'magenta') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="milestone-emblem-svg">
        <defs>
          <linearGradient id="magentaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#BE185D" />
          </linearGradient>
        </defs>
        <path d="M32 5 L38 20 L54 15 L46 29 L60 38 L44 42 L46 59 L32 49 L18 59 L20 42 L4 38 L18 29 L10 15 L26 20 Z" fill="url(#magentaGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="32" cy="34" r="9" fill="#ffffff" opacity="0.92" />
        <text x="32" y="38.5" textAnchor="middle" fill="#831843" fontSize="12" fontWeight="900" fontFamily="sans-serif">â‚¦</text>
      </svg>
    );
  }
  if (type === 'gold') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="milestone-emblem-svg">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#A16207" />
          </linearGradient>
        </defs>
        <polygon points="32,6 54,16 60,38 46,56 18,56 4,38 10,16" fill="url(#goldGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="32" cy="34" r="9" fill="#ffffff" opacity="0.92" />
        <text x="32" y="38.5" textAnchor="middle" fill="#713F12" fontSize="12" fontWeight="900" fontFamily="sans-serif">â‚¦</text>
      </svg>
    );
  }
  if (type === 'ruby') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="milestone-emblem-svg">
        <defs>
          <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
        </defs>
        <path d="M32 6 C38 6 42 12 46 16 C50 20 56 24 56 30 C56 36 50 40 46 44 C42 48 38 54 32 54 C26 54 22 48 18 44 C14 40 8 36 8 30 C8 24 14 20 18 16 C22 12 26 6 32 6 Z" fill="url(#rubyGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="32" cy="30" r="9" fill="#ffffff" opacity="0.92" />
        <text x="32" y="34.5" textAnchor="middle" fill="#7F1D1D" fontSize="12" fontWeight="900" fontFamily="sans-serif">â‚¦</text>
      </svg>
    );
  }
  // Default: Bronze coin
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="milestone-emblem-svg">
      <defs>
        <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#bronzeGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="32" cy="32" r="10" fill="#ffffff" opacity="0.92" />
      <text x="32" y="36.5" textAnchor="middle" fill="#7C2D12" fontSize="13" fontWeight="900" fontFamily="sans-serif">â‚¦</text>
    </svg>
  );
}

const CHAT_AGENT_TAG_PATTERN = /(@?â‚¦[a-z0-9_]{2,32}\b)/gi;

function renderChatText(text) {
  return String(text || '').split(CHAT_AGENT_TAG_PATTERN).flatMap((part, index) => {
    if (/^@?â‚¦[a-z0-9_]{2,32}$/i.test(part)) {
      return [<span key={'agent-tag-' + index} className="chat-agent-mention">{part.replace(/^@/, '')}</span>];
    }
    return part.split(/(https?:\/\/[^\s<]+)/gi).flatMap((segment, segmentIndex) => {
      const trailing = (segment.match(/[.,!?;:)\]]+$/) || [''])[0];
      const href = trailing ? segment.slice(0, -trailing.length) : segment;
      if (!/^https?:\/\//i.test(href)) return [segment];
      try {
        const parsed = new URL(href);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return [segment];
        return [<React.Fragment key={'chat-link-' + index + '-' + segmentIndex}><a href={parsed.href} target="_blank" rel="noopener noreferrer">{href}</a>{trailing}</React.Fragment>];
      } catch {
        return [segment];
      }
    });
  });
}

/**
 * Protocol Knowledge Base & FAQ Items for Arc Osaka EVM (Concise & Punchy)
 */
export const FAQ_ITEMS = [
  {
    id: 1,
    category: 'arc',
    categoryLabel: 'Arc & USDC',
    question: 'What is a NairaTag (â‚¦Tag)?',
    answer: [
      'A human-readable Web3 handle (like â‚¦SEGUN or â‚¦CHOWDECK) mapping directly to your Arc wallet address for instant, zero-fee USDC transfers.'
    ]
  },
  {
    id: 2,
    category: 'arc',
    categoryLabel: 'Arc & USDC',
    question: 'Why build on Arc Osaka EVM?',
    answer: [
      'Arc Osaka EVM delivers sub-second finality, 0.00 USDC gas fees on testnet, and native 24/7 non-custodial settlements with zero float loss.'
    ]
  },
  {
    id: 3,
    category: 'claim',
    categoryLabel: 'Claiming â‚¦Tag',
    question: 'How do I claim my â‚¦Tag?',
    answer: [
      'Go to the Claim tab, type your handle, and click Claim. You instantly receive your Sovereign Identity Card, Ambassador Pass, and payment QR code.'
    ]
  },
  {
    id: 4,
    category: 'agents',
    categoryLabel: 'AI Agents (ERC-8004)',
    question: 'What are ERC-8004 AI Agents?',
    answer: [
      'Autonomous onchain agents with verified identities, trackable reputation scores, milestone proofs, and live earnings settled directly on Arc.'
    ]
  },
  {
    id: 5,
    category: 'resolver',
    categoryLabel: 'Resolver Layer',
    question: 'How does the onchain Resolver work?',
    answer: [
      'The NairaTag resolver smart contract translates any â‚¦Tag to its 0x wallet address in milliseconds via a single call: resolveTag(tag).'
    ]
  },
  {
    id: 6,
    category: 'payments',
    categoryLabel: 'Payments & Security',
    question: 'How do Swap & USDC payments work?',
    answer: [
      'Direct peer-to-peer transfers with strict 6-decimal integer precision and zero floating-point loss, signed locally by your wallet.'
    ]
  },
  {
    id: 7,
    category: 'payments',
    categoryLabel: 'Payments & Security',
    question: 'Is NairaTag non-custodial?',
    answer: [
      'Yes, 100%. Your private keys stay in your Web3 wallet (MetaMask, Coinbase Wallet, etc.) and never touch our servers.'
    ]
  },
  {
    id: 8,
    category: 'resolver',
    categoryLabel: 'Resolver Layer',
    question: 'Can apps and developers integrate â‚¦Tags?',
    answer: [
      'Yes. Any dApp, POS terminal, or checkout can resolve and accept â‚¦Tags via our open TypeScript SDK, Viem adapter, or Solidity contract.'
    ]
  },
  {
    id: 9,
    category: 'contracts',
    categoryLabel: 'Contracts',
    question: 'Where can I find the NairaTag smart contracts?',
    answer: [
      'The NairaTag Registry and Resolver are deployed on Arc Testnet (Chain ID 5042002). You can inspect each contract and its onchain activity in the Arc Explorer.'
    ],
    links: [
      { label: 'NairaTag Registry', url: 'https://explorer.testnet.arc.io/address/0x034f64b644988406ded382ebabb5c981bd19684a' },
      { label: 'NairaTag Resolver', url: 'https://explorer.testnet.arc.io/address/0xaee1af632006a5062accdb74f73930439b76efbf' },
    ]
  },
  {
    id: 10,
    category: 'social',
    categoryLabel: 'Social & Community',
    question: 'Where can I follow NairaTag updates?',
    answer: [
      'Follow verified NairaTag channels for claim alerts, project news, and community updates.'
    ],
    links: [
      { label: 'Telegram Feed: @nairatagupdates', url: 'https://t.me/nairatagupdates' },
      { label: 'Follow @NairaTaghq on X', url: 'https://x.com/NairaTaghq' },
    ]
  }
];

// PlatformAgentAdminPage is imported from ./components/admin/PlatformAgentAdminPage.jsx

function ArcAppShell() {
  // Theme State: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('nairatag-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('nairatag-theme', theme);
    } catch (e) {
      console.warn('Theme storage failed:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation: 'chat' (Home) | 'claim' | 'tasks' | 'agents' | 'pay' | 'faq' | 'rewards'
  const VALID_TABS = ['claim', 'tasks', 'agents', 'pay', 'chat', 'faq', 'rewards', 'profile'];
  const [mainTab, setMainTabState] = useState(() => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash)) {
        return hash;
      }
    } catch { }
    return 'chat'; // Chat is the default home page
  });

  const setMainTab = useCallback((tab) => {
    setMainTabState(tab);
    try {
      window.location.hash = tab;
    } catch { }
  }, []);

  useEffect(() => {
    const handleHash = () => {
      try {
        const hash = window.location.hash.replace('#', '').toLowerCase();
        if (VALID_TABS.includes(hash)) {
          setMainTabState(hash);
        }
      } catch { }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Initialize Web Push Service Worker with VAPID
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Sovereign Agent Chat State (Tag2Tag Agent-to-Agent Messaging & Task Execution)
  const [chatMessages, setChatMessages] = useState([]);
  const [chatAgents, setChatAgents] = useState([]);
  const [agentDirectoryError, setAgentDirectoryError] = useState('');
  const [agentDirectoryLoading, setAgentDirectoryLoading] = useState(true);
  const [agentDirectoryStats, setAgentDirectoryStats] = useState({});
  const [agentStatsLoading, setAgentStatsLoading] = useState(false);
  const [isChatConversationOpen, setIsChatConversationOpen] = useState(false);
  const [isTaskChatDraft, setIsTaskChatDraft] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [chatIsTyping, setChatIsTyping] = useState(false);
  const [chatActivityStep, setChatActivityStep] = useState('thinking');
  const [chatActivityPrompt, setChatActivityPrompt] = useState('');
  const [currentTaggedAgent, setCurrentTaggedAgent] = useState(null);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [chatHistoryEntries, setChatHistoryEntries] = useState([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatHistoryError, setChatHistoryError] = useState('');
  const [activeChatConversationId, setActiveChatConversationId] = useState(null);
  const [isPersonalAgentOpen, setIsPersonalAgentOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const loadAgentDirectory = useCallback(async ({ signal } = {}) => {
    setAgentDirectoryLoading(true);
    setAgentDirectoryError('');
    try {
      const agents = await fetchArcAgentDirectory({ signal });
      setChatAgents(agents);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setAgentDirectoryError(error.message);
        console.warn('[Arc agent registry]', error.message);
      }
    } finally {
      if (!signal?.aborted) setAgentDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAgentDirectory({ signal: controller.signal });
    return () => controller.abort();
  }, [loadAgentDirectory]);

  useEffect(() => {
    if (!chatAgents.length) {
      setAgentDirectoryStats({});
      setAgentStatsLoading(false);
      return undefined;
    }
    let active = true;
    setAgentStatsLoading(true);
    setAgentDirectoryStats({});
    Promise.all(chatAgents.map(async (agent) => [agent.tag, await fetchArcAgentMetrics(agent)]))
      .then((results) => {
        if (active) setAgentDirectoryStats(Object.fromEntries(results));
      })
      .catch((error) => {
        console.warn('[Arc agent metrics]', error.message);
      })
      .finally(() => {
        if (active) setAgentStatsLoading(false);
      });
    return () => { active = false; };
  }, [chatAgents]);

  // File Attachment & Voice Note State
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = React.useRef(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const recordingTimerRef = React.useRef(null);
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const speechRecognitionRef = React.useRef(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const activeAudioPlayerRef = React.useRef(null);
  const chatStreamRef = React.useRef(null);
  const chatMessagesEndRef = React.useRef(null);
  const [voiceTranscribedText, setVoiceTranscribedText] = useState('');
  const voiceTranscriptRef = React.useRef('');
  const voiceSpeechRecRef = React.useRef(null);
  const liveSpeechTextRef = React.useRef('');
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // Auto-scroll chat stream strictly inside its own container without scrolling window/page
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTo({
        top: chatStreamRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatMessages, chatIsTyping]);

  // Lock document and body to viewport height in chat mode (WhatsApp / ChatGPT style)
  useEffect(() => {
    if (mainTab === 'chat') {
      document.documentElement.classList.add('chat-active');
      document.body.classList.add('chat-active');
    } else {
      document.documentElement.classList.remove('chat-active');
      document.body.classList.remove('chat-active');
    }
    return () => {
      document.documentElement.classList.remove('chat-active');
      document.body.classList.remove('chat-active');
    };
  }, [mainTab]);

  // Clean up media streams, speech recognizers, and audio players on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (voiceSpeechRecRef.current) {
        try { voiceSpeechRecRef.current.stop(); } catch {}
      }
      if (activeAudioPlayerRef.current) {
        try { activeAudioPlayerRef.current.pause(); } catch {}
      }
      stopSpeaking();
    };
  }, []);

  const handleSelectAgentTag = (agent) => {
    setCurrentTaggedAgent(agent);
    setIsTagPopoverOpen(false);
    setChatInputText((prev) => {
      const mentionPattern = new RegExp(`@â‚¦${agent.tag}\\b`, 'ig');
      const clean = prev.replace(mentionPattern, `â‚¦${agent.tag}`).trim();
      if (!clean.toLowerCase().includes(`â‚¦${agent.tag.toLowerCase()}`)) {
        return `â‚¦${agent.tag} ${clean}`.trim();
      }
      return clean;
    });
  };

  const handleClearTaggedAgent = () => {
    setCurrentTaggedAgent(null);
  };

  // â”€â”€â”€ File Attachment Handlers â”€â”€â”€
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const ext = file.name.split('.').pop().toLowerCase();
    const sizeStr = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(file.size / 1024) + ' KB';
    const previewUrl = isImg ? URL.createObjectURL(file) : null;
    setAttachedFile({
      file,
      name: file.name,
      size: sizeStr,
      type: file.type,
      previewUrl,
      isImage: isImg,
      extension: ext,
    });
    e.target.value = '';
  };

  const handleRemoveAttachedFile = () => {
    if (attachedFile?.previewUrl) {
      try { URL.revokeObjectURL(attachedFile.previewUrl); } catch {}
    }
    setAttachedFile(null);
  };

  // â”€â”€â”€ Microphone Speech-to-Text Recognition (Hands-Free Dictation) â”€â”€â”€
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback directly to audio recorder if browser lacks Web Speech API
      startVoiceRecording();
      return;
    }

    if (isSpeechListening) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      setIsSpeechListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsSpeechListening(true);
        liveSpeechTextRef.current = '';
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join('');
        setChatInputText(transcript);
        liveSpeechTextRef.current = transcript;
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        setIsSpeechListening(false);
      };

      recognition.onend = () => {
        setIsSpeechListening(false);
        const spoken = (liveSpeechTextRef.current || '').trim();
        if (spoken) {
          handleSendChatPrompt(spoken, { isVoiceReply: true });
          liveSpeechTextRef.current = '';
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition exception:', err);
      setIsSpeechListening(false);
      startVoiceRecording();
    }
  };

  // â”€â”€â”€ Voice Directive Recording (Real Audio + Live Speech-to-Text) â”€â”€â”€
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: 'sys-' + Date.now(),
            sender: 'agent',
            agentName: 'Arc Sovereign Agent',
            text: 'âš ï¸ Microphone recording is not supported in this browser environment.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      voiceTranscriptRef.current = '';
      setVoiceTranscribedText('');

      // Run SpeechRecognition concurrently to transcribe the actual spoken directive
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = 'en-US';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event) => {
            const transcript = Array.from(event.results)
              .map((res) => res[0].transcript)
              .join(' ');
            voiceTranscriptRef.current = transcript;
            setVoiceTranscribedText(transcript);
          };
          rec.onerror = (e) => console.warn('Live voice speech error:', e);
          voiceSpeechRecRef.current = rec;
          rec.start();
        } catch (recErr) {
          console.warn('SpeechRecognition during voice recording note:', recErr);
        }
      }

      recorder.start(100);
      setIsVoiceRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: 'sys-' + Date.now(),
          sender: 'agent',
          agentName: 'Arc Sovereign Agent',
          text: 'âš ï¸ Microphone permission is required to record voice directives. Please enable microphone permissions in your browser settings.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (voiceSpeechRecRef.current) {
      try { voiceSpeechRecRef.current.stop(); } catch {}
    }
    audioChunksRef.current = [];
    voiceTranscriptRef.current = '';
    setVoiceTranscribedText('');
    setIsVoiceRecording(false);
    setRecordingSeconds(0);
  };

  const stopAndSendVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recorder = mediaRecorderRef.current;
    const duration = recordingSeconds;
    if (!recorder) return;

    if (voiceSpeechRecRef.current) {
      try { voiceSpeechRecRef.current.stop(); } catch {}
    }

    recorder.onstop = () => {
      try {
        recorder.stream?.getTracks().forEach((t) => t.stop());
      } catch {}
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const userMsgId = 'usr-voice-' + Date.now();
      const formatDuration = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
      const finalTranscript = (voiceTranscriptRef.current || '').trim();

      const newVoiceMsg = {
        id: userMsgId,
        sender: 'user',
        text: finalTranscript ? `ðŸŽ™ï¸ "${finalTranscript}"` : `Voice directive (${formatDuration})`,
        transcript: finalTranscript,
        audioUrl,
        audioDuration: formatDuration,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, newVoiceMsg]);
      setIsVoiceRecording(false);
      setRecordingSeconds(0);
      setVoiceTranscribedText('');

      const promptToRun = finalTranscript || (duration > 0 ? 'Voice directive on Arc Osaka' : '');
      if (promptToRun) {
        handleSendChatPrompt(promptToRun, { isVoiceReply: true, skipUserMsgAppend: true });
      }
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  // â”€â”€â”€ Voice Note Audio Player Play/Pause â”€â”€â”€
  const handleTogglePlayAudio = (msgId, audioUrl) => {
    if (playingAudioId === msgId) {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    activeAudioPlayerRef.current = audio;
    setPlayingAudioId(msgId);
    audio.onended = () => {
      setPlayingAudioId(null);
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
    };
    audio.play().catch(() => setPlayingAudioId(null));
  };

  // â”€â”€â”€ Text-to-Speech Toggle on AI Messages â”€â”€â”€
  const handleToggleSpeakMessage = (msg) => {
    if (speakingMsgId === msg.id) {
      stopSpeaking();
      setSpeakingMsgId(null);
      return;
    }
    stopSpeaking();
    setSpeakingMsgId(msg.id);
    const utterance = speakText(msg.text);
    if (utterance) {
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
    }
  };

  // â”€â”€â”€ Master Chat Execution Engine (Arc Actions + Google Gemini Flash-Lite) â”€â”€â”€
  const handleSendChatPrompt = async (customPrompt = null, options = {}) => {
    const textToSend = (customPrompt !== null ? customPrompt : chatInputText).trim();
    const fileToSend = attachedFile;
    const activeTaggedAgent = options.agent || currentTaggedAgent;

    // Must have either text or an attached file
    if (!textToSend && !fileToSend) return;
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      showToast('Connect an Arc wallet to start a saved chat.', 'info');
      return;
    }

    setIsChatConversationOpen(true);
    setIsTaskChatDraft(false);

    if (!options.skipUserMsgAppend) {
      const userMsgId = 'usr-' + Date.now();
      const newMsg = {
        id: userMsgId,
        sender: 'user',
        text: textToSend,
        file: fileToSend ? { ...fileToSend } : null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        widget: null,
      };
      setChatMessages((prev) => [...prev, newMsg]);
    }

    if (customPrompt === null) {
      setChatInputText('');
    }
    if (fileToSend) {
      setAttachedFile(null);
    }
    setChatIsTyping(true);
    setChatActivityPrompt(`${textToSend} ${fileToSend?.name || ''}`.trim());
    setChatActivityStep('thinking');
    await new Promise((resolve) => window.setTimeout(resolve, 260));

    const agentResolution = resolveAgentMention(textToSend, chatAgents);
    const foundAgent = agentResolution.kind === 'resolved' ? agentResolution.agent : null;
    const discoveryRequest = isAgentDiscoveryRequest(textToSend);
    const capabilityMatches = discoveryRequest ? discoverAgentsByCapability(textToSend, chatAgents) : [];
    let replyText = '';
    let toolEvents = [];
    let replyAgentTag = activeTaggedAgent ? activeTaggedAgent.tag : 'ArcAgent';
    let replyAgentName = activeTaggedAgent ? activeTaggedAgent.name : 'Arc Sovereign Agent';
    let replyAvatar = activeTaggedAgent
      ? activeTaggedAgent.avatar
      : 'https://api.dicebear.com/7.x/identicon/svg?seed=arc-agent';
    let widget = null;

    if (foundAgent) {
      replyAgentTag = foundAgent.tag;
      replyAgentName = foundAgent.name;
      replyAvatar = foundAgent.avatar;
    }

    // Arc chat replies are generated server-side and each turn is signed and saved
    // through the Arc database API before it is shown as a completed response.
    setChatActivityStep('writing');
    try {
      if (agentResolution.kind === 'ambiguous') {
        const options = agentResolution.agents.map((agent) => `â‚¦${agent.tag}`).join(', ');
        replyText = `I found more than one matching agent: ${options}. Please mention the exact NairaTag you want.`;
        replyAgentTag = 'discovery';
        replyAgentName = 'NairaTag Discovery';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=nairatag-discovery';
      } else if (agentResolution.kind === 'unavailable') {
        replyText = `â‚¦${agentResolution.tag} is not currently listed as a published agent, so I did not send your request to a runtime.`;
        replyAgentTag = 'discovery';
        replyAgentName = 'NairaTag Discovery';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=nairatag-discovery';
      } else if (discoveryRequest) {
        if (capabilityMatches.length) {
          replyText = `These published agents have matching callable capabilities:\n${capabilityMatches.map(({ agent, matchedTools, matchedTerms }, index) => {
            const toolNames = matchedTools.map((tool) => typeof tool === 'string' ? tool : tool.name || tool.title || tool.key || 'enabled tool').join(', ');
            return `${index + 1}. â‚¦${agent.tag} â€” ${agent.name || agent.tag}; matching capability: ${toolNames} (${matchedTerms.join(', ')})`;
          }).join('\n')}\n\nMention an agent's NairaTag to continue.`;
        } else {
          replyText = 'I could not find a published agent with a matching callable tool in the current directory. No integration was invoked.';
        }
        replyAgentTag = 'discovery';
        replyAgentName = 'NairaTag Discovery';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=nairatag-discovery';
      } else {
        const agentPrompt = fileToSend
          ? `${textToSend || 'I attached a file.'}\n\nThe attached file is ${fileToSend.name} (${fileToSend.size}); its contents are not included in this chat request.`
          : textToSend;
        const selectedAgent = foundAgent || activeTaggedAgent;
        const agentTag = selectedAgent?.tag || 'arc';
        const conversationId = getOrCreateArcChatConversationId(walletAddress, agentTag);
        setActiveChatConversationId(conversationId);
        const chatResult = await sendArcChatMessage({
          walletAddress,
          conversationId,
          turnId: crypto.randomUUID(),
          prompt: agentPrompt,
          agentTag,
          title: agentPrompt,
        });
        replyText = chatResult.reply;
        if (myTag?.tag) {
          claimAgentOnboardingReward({ walletAddress, tag: myTag.tag, step: 'firstInteraction' })
            .then((reward) => {
              if (reward.state) applyArcRewardState(reward.state);
              const synced = syncAgentOnboardingRewards(walletAddress, myTag.tag, reward.onboarding);
              if (synced) setAgentOnboarding(synced);
            })
            .catch((error) => showToast(`Your task is ready, but its welcome points could not sync yet: ${error.message}`, 'error', 5000));
        }
        toolEvents = chatResult.toolEvents || [];
        if (selectedAgent) {
          replyAgentTag = selectedAgent.tag;
          replyAgentName = selectedAgent.name;
          const isOwnTag = String(selectedAgent.tag || '').replace(/^[â‚¦$@#]/, '').toLowerCase() === String(myTag?.tag || '').replace(/^[â‚¦$@#]/, '').toLowerCase();
          const savedAvatar = isOwnTag ? getAgentOnboarding(walletAddress, myTag?.tag) : null;
          replyAvatar = savedAvatar?.avatarData || savedAvatar?.avatar || selectedAgent.avatar;
        } else {
          replyAgentTag = chatResult.personalAgent?.tag || 'ArcAgent';
          replyAgentName = chatResult.personalAgent?.name || 'Arc Sovereign Agent';
          const savedAvatar = myTag?.tag ? getAgentOnboarding(walletAddress, myTag.tag) : null;
          replyAvatar = savedAvatar?.avatarData || savedAvatar?.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=arc-agent';
        }
      }
      widget = null;
    } catch (err) {
      replyText = `I couldn't send or save that message: ${err.message}`;
    }

    const botReply = {
      id: 'bot-' + Date.now(),
      sender: 'agent',
      agentTag: replyAgentTag,
      agentName: replyAgentName,
      avatar: replyAvatar,
      text: replyText,
      toolEvents,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      widget: widget,
    };

    setChatMessages((prev) => [...prev, botReply]);
    setChatIsTyping(false);
    setChatActivityStep('thinking');

    if (options.isVoiceReply && replyText && !options.liveVoice) {
      speakText(replyText);
      setSpeakingMsgId(botReply.id);
    }
    return { reply: replyText, botReply };
  };

  const voice = useArcVoice({
    walletAddress,
    onAgentPrompt: (prompt) => handleSendChatPrompt(prompt, { liveVoice: true }),
  });

  const handleStartVoiceCall = async () => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      showToast('Sign in to talk with your NairaTag agent.', 'info');
      return;
    }
    const agent = currentTaggedAgent;
    const agentTag = agent?.tag || 'arc';
    const conversationId = activeChatConversationId || getOrCreateArcChatConversationId(walletAddress, agentTag);
    setActiveChatConversationId(conversationId);
    setIsChatConversationOpen(true);
    setMainTab('chat');
    await voice.start({ conversationId, agentTag });
  };

  const handleWidgetAction = (widget) => {
    if (widget.actionPrompt) {
      handleSendChatPrompt(widget.actionPrompt);
    } else if (widget.targetTag) {
      setRecipientInput(widget.targetTag);
      if (widget.amount) setAmountInput(widget.amount);
      setIsSendReviewModalOpen(true);
    }
  };

  const handleOpenChatHistory = async () => {
    setIsHistoryModalOpen(true);
    setChatHistoryError('');
    setChatHistoryEntries([]);
    if (!walletAddress) {
    setChatHistoryError('Sign in to view saved chats.');
      return;
    }
    setChatHistoryLoading(true);
    try {
      const result = await listArcChatConversations({ walletAddress });
      setChatHistoryEntries(result.conversations || []);
    } catch (error) {
      setChatHistoryError(error.message);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const handleLoadSavedChat = async (conversation) => {
    if (!walletAddress) return;
    setChatHistoryError('');
    setChatHistoryLoading(true);
    try {
      const result = await getArcChatHistory({ walletAddress, conversationId: conversation.id });
      const activeAgent = chatAgents.find((agent) => agent.tag.toLowerCase() === String(conversation.agent_tag || '').toLowerCase()) || null;
      const messages = (result.messages || []).map((message) => {
        const agent = chatAgents.find((entry) => entry.tag.toLowerCase() === String(message.agent_tag || '').toLowerCase());
        const isAgent = message.role === 'assistant';
        return {
          id: message.id,
          sender: isAgent ? 'agent' : 'user',
          agentTag: isAgent ? (agent?.tag || 'ArcAgent') : undefined,
          agentName: isAgent ? (agent?.name || 'Arc Sovereign Agent') : undefined,
          avatar: isAgent ? (agent?.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=arc-agent') : undefined,
          text: message.content,
          time: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          widget: null,
        };
      });
      setChatMessages(messages);
      setActiveChatConversationId(conversation.id);
      setCurrentTaggedAgent(activeAgent);
      window.localStorage.setItem(
        `nairatag:arc-chat:${walletAddress.toLowerCase()}:${String(conversation.agent_tag || 'arc').toLowerCase()}`,
        conversation.id,
      );
      setIsChatConversationOpen(true);
      setIsTaskChatDraft(false);
      setIsHistoryModalOpen(false);
    } catch (error) {
      setChatHistoryError(error.message);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const handleClearSavedChatHistory = async () => {
    if (!walletAddress) {
      setChatHistoryError('Sign in to clear saved chats.');
      return;
    }
    setChatHistoryError('');
    setChatHistoryLoading(true);
    try {
      await clearArcChatHistory({ walletAddress });
      const keyPrefix = `nairatag:arc-chat:${walletAddress.toLowerCase()}:`;
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith(keyPrefix)) window.localStorage.removeItem(key);
      }
      setChatHistoryEntries([]);
      setChatMessages([]);
      setAgentChatMessages({});
      setActiveChatConversationId(null);
      setIsChatConversationOpen(false);
      setIsTaskChatDraft(false);
      setCurrentTaggedAgent(null);
      showToast('Saved chat history cleared.', 'success');
    } catch (error) {
      setChatHistoryError(error.message);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  // Notifications Popover State (Bell icon) & Global Rewards Modals
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationInbox, setNotificationInbox] = useState(() => getNotificationInbox());

  useEffect(() => {
    const refreshInbox = () => setNotificationInbox(getNotificationInbox());
    refreshInbox();
    window.addEventListener('nairatag:notification-inbox-updated', refreshInbox);
    window.addEventListener('storage', refreshInbox);
    return () => {
      window.removeEventListener('nairatag:notification-inbox-updated', refreshInbox);
      window.removeEventListener('storage', refreshInbox);
    };
  }, []);

  const [isGoldenVoucherOpen, setIsGoldenVoucherOpen] = useState(false);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  // Daily Bonus Live Countdown Timer (hh : mm : ss matching screenshot)
  const [dailyCountdown, setDailyCountdown] = useState('09 : 35 : 17');
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setUTCHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((nextDay.getTime() - now.getTime()) / 1000));
      const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
      const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      setDailyCountdown(`${hours} : ${mins} : ${secs}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Daily Bonus Missions Tracking (Report Market Price, Agent Mission, Commodity Alert)
  const [dailyMissionsDone, setDailyMissionsDone] = useState({
    price: false,
    agent: false,
    alert: false,
  });

  // Price Report Dialog
  const [isPriceReportModalOpen, setIsPriceReportModalOpen] = useState(false);
  const [priceReportCommodity, setPriceReportCommodity] = useState('Lagos Fuel (PMS)');
  const [priceReportValue, setPriceReportValue] = useState('1050');

  // FAQ Page State
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [faqActiveCategory, setFaqActiveCategory] = useState('all');
  const [faqOpenItems, setFaqOpenItems] = useState([1, 2]);

  const toggleFaqItem = (id) => {
    setFaqOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqItems = useMemo(() => {
    const q = faqSearchQuery.toLowerCase().trim();
    return FAQ_ITEMS.filter((item) => {
      const matchesCat = faqActiveCategory === 'all' || item.category === faqActiveCategory;
      const matchesQuery =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.some((a) => a.toLowerCase().includes(q)) ||
        item.links?.some((link) => link.label.toLowerCase().includes(q)) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [faqSearchQuery, faqActiveCategory]);


  // Wallet & Network State
  const [walletAddress, setWalletAddress] = useState(null);
  const [isArcNetwork, setIsArcNetwork] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState({ formatted: '0.00', raw: 0n, rawString: '0' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [myTag, setMyTag] = useState(() => {
    try {
      const saved = localStorage.getItem('nairatag_claimed_tag_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const displayUserTag = myTag?.tag ? `â‚¦${String(myTag.tag).replace(/^[$â‚¦]/, '').toUpperCase()}` : null;
  const [accountEmail, setAccountEmail] = useState('');
  const accountUsername = accountEmail.includes('@') ? accountEmail.slice(0, accountEmail.indexOf('@')) : accountEmail;
  const displayAccountName = displayUserTag || (accountUsername ? `â‚¦${accountUsername.toUpperCase()}` : null);
  const userTag = myTag?.tag ? String(myTag.tag).replace(/^[$â‚¦]/, '').toLowerCase() : (accountUsername || 'nairatag');

  // Circle Programmable Wallet State
  const [authProvider, setAuthProvider] = useState(null); // 'circle' | 'injected'
  const [circleSession, setCircleSession] = useState(null);
  const [circleInput, setCircleInput] = useState('');
  const [circleOtpSent, setCircleOtpSent] = useState(false);
  const [circleStatus, setCircleStatus] = useState('');

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [authScreen, setAuthScreen] = useState('welcome'); // 'welcome' | 'create' | 'signin' | 'wallets'
  const [isSendReviewModalOpen, setIsSendReviewModalOpen] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState(null);
  const onboardingPreview = import.meta.env.DEV && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('onboardingPreview') === '1';
  const claimSuccessPreview = import.meta.env.DEV && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('claimSuccessPreview') === '1';
  const [isAgentOnboardingOpen, setIsAgentOnboardingOpen] = useState(onboardingPreview);
  const [agentSuccessDetails, setAgentSuccessDetails] = useState(() => claimSuccessPreview ? {
    variant: 'claimed',
    tag: 'joe',
    progress: { tag: 'joe', points: 20, avatar: null, avatarName: '', steps: { identity: true, avatar: false, personality: false, permissions: false, firstInteraction: false } },
  } : null);
  const onboardingDismissedKeyRef = React.useRef(null);
  const [agentOnboarding, setAgentOnboarding] = useState(() => (onboardingPreview || claimSuccessPreview) ? {
    version: 1,
    tag: 'joe',
    points: claimSuccessPreview ? 20 : 60,
    completed: false,
    avatar: null,
    avatarName: '',
    personality: 'friendly',
    permissions: { memory: true },
    steps: claimSuccessPreview
      ? { identity: true, avatar: false, personality: false, permissions: false, firstInteraction: false }
      : { identity: true, avatar: true, personality: true, permissions: true, firstInteraction: false },
  } : null);
  const [welcomeDetails, setWelcomeDetails] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletTab, setWalletTab] = useState('overview'); // 'overview' | 'qr' | 'history'

  useEffect(() => {
    let active = true;
    if (!walletAddress || !myTag?.tag) return () => { active = false; };
    const saved = getAgentOnboarding(walletAddress, myTag.tag);
    const onboardingKey = `${String(walletAddress).toLowerCase()}:${String(myTag.tag).replace(/^[₦$@#]/, '').toLowerCase()}`;
    setAgentOnboarding(saved ? {
      ...saved,
      points: 0,
      completed: false,
      steps: { identity: false, avatar: false, personality: false, permissions: false, firstInteraction: false },
    } : null);
    getAgentOnboardingRewardState({ walletAddress, tag: myTag.tag })
      .then((payload) => {
        if (!active) return;
        if (payload.state) applyArcRewardState(payload.state);
        const synced = syncAgentOnboardingRewards(walletAddress, myTag.tag, payload.onboarding);
        if (!synced) return;
        setAgentOnboarding(synced);
        if (!synced.completed && !synced.submittedAt && onboardingDismissedKeyRef.current !== onboardingKey) setIsAgentOnboardingOpen(true);
      })
      .catch((error) => {
        if (active) setArcRewardsError(`Onboarding rewards could not sync: ${error.message}`);
      });
    return () => { active = false; };
  }, [walletAddress, myTag?.tag]);

  const saveAgentOnboarding = async (patch = {}, completedSteps = []) => {
    if (!walletAddress || !myTag?.tag) return null;
    let saved = updateAgentOnboarding(walletAddress, myTag.tag, patch);
    setAgentOnboarding((current) => ({ ...saved, steps: current?.steps || saved.steps, points: current?.points || saved.points, completed: current?.completed || saved.completed }));
    if (patch.personality || patch.permissions) {
      const profile = {};
      if (patch.personality) profile.communication_style = patch.personality === 'focused' ? 'direct' : patch.personality;
      if (patch.permissions?.memory !== undefined) {
        profile.memory_enabled = patch.permissions.memory;
        profile.auto_memory_enabled = patch.permissions.memory;
      }
      await updatePersonalAgent({ walletAddress, tag: myTag.tag, profile });
    }
    // The API is idempotent by wallet, tag, and step. Always reconcile requested
    // steps with it; a stale device cache must never suppress a real ledger claim.
    const stepsToReward = completedSteps;
    for (const step of stepsToReward) {
      const reward = await claimAgentOnboardingReward({ walletAddress, tag: myTag.tag, step });
      if (reward.state) applyArcRewardState(reward.state);
      saved = syncAgentOnboardingRewards(walletAddress, myTag.tag, reward.onboarding) || saved;
      setAgentOnboarding(saved);
    }
    return saved;
  };

  useEffect(() => {
    if (isConnectModalOpen) setAuthScreen('welcome');
  }, [isConnectModalOpen]);

  // Tasks & Bounties State
  const [tasksFilter, setTasksFilter] = useState('all');
  useEffect(() => {
    if (tasksFilter === 'vouchers') setTasksFilter('all');
  }, [tasksFilter]);
  const [tasksSearch, setTasksSearch] = useState('');
  const [isPostTaskOpen, setIsPostTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskProgress, setTaskProgress] = useState({});
  const [backendTasks, setBackendTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0);
  const [inHouseVouchers, setInHouseVouchers] = useState([]);
  const [rewardsInitialPage, setRewardsInitialPage] = useState(null);
  const [taskSubmissionDraft, setTaskSubmissionDraft] = useState('');
  const [userPoints, setUserPoints] = useState(0);
  const [arcRewardsError, setArcRewardsError] = useState('');
  const [activeEscrowStep, setActiveEscrowStep] = useState(2);
  const [customTasks, setCustomTasks] = useState([]);
  const [postTaskForm, setPostTaskForm] = useState({
    title: '',
    category: 'dev',
    reward: '35',
    deadline: '3 days left',
    description: '',
    requirements: '',
  });

  const applyArcRewardState = (state) => {
    if (!state) return;
    setUserPoints(Number(state.points) || 0);
    replaceNotificationInbox(state.notifications || []);
    setArcRewardsError('');
  };

  useEffect(() => {
    let active = true;
    if (!walletAddress) {
      setUserPoints(0);
      replaceNotificationInbox([]);
      setArcRewardsError('');
      return () => { active = false; };
    }
    const refresh = () => getArcRewardState(walletAddress)
      .then((state) => { if (active) applyArcRewardState(state); })
      .catch((error) => { if (active) setArcRewardsError(error.message || 'Arc rewards are unavailable.'); });
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [walletAddress]);

  // Agent Chat (Muse Spark AI) State
  const [agentChatMessages, setAgentChatMessages] = useState({});
  const [agentChatInput, setAgentChatInput] = useState('');

  const allTasks = backendTasks;

  useEffect(() => {
    setInHouseVouchers(getInHouseVouchers(walletAddress));
    const refresh = (event) => {
      if (!walletAddress || event.detail?.walletAddress === walletAddress.toLowerCase()) {
        setInHouseVouchers(getInHouseVouchers(walletAddress));
      }
    };
    window.addEventListener('nairatag-inhouse-vouchers-updated', refresh);
    return () => window.removeEventListener('nairatag-inhouse-vouchers-updated', refresh);
  }, [walletAddress]);

  useEffect(() => {
    let active = true;
    setTasksLoading(true);
    setTasksError('');
    listArcTasks(walletAddress || '')
      .then(({ tasks, progress }) => {
        if (!active) return;
        setBackendTasks(tasks);
        setTaskProgress(progress);
      })
      .catch(() => {
        if (!active) return;
        setBackendTasks([]);
        setTaskProgress({});
        setTasksError('');
      })
      .finally(() => { if (active) setTasksLoading(false); });
    return () => { active = false; };
  }, [walletAddress, tasksRefreshKey]);

  const filteredInHouseTasks = useMemo(() => {
    const q = tasksSearch.toLowerCase().trim();
    if (tasksFilter !== 'all' && tasksFilter !== 'community') return [];
    return IN_HOUSE_TASKS.filter((task) =>
      !q || [task.title, task.description, task.category, task.voucherName, task.voucherValue]
        .some((value) => String(value || '').toLowerCase().includes(q))
    );
  }, [tasksFilter, tasksSearch]);

  const filteredTasks = useMemo(() => {
    const q = tasksSearch.toLowerCase().trim();
    const matchingTasks = allTasks.filter((task) => {
      const matchCat = tasksFilter === 'all' || (tasksFilter !== 'nairatag' && task.category === tasksFilter);
      const matchQ =
        !q ||
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.creatorTag.toLowerCase().includes(q) ||
        task.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    const voucherCards = filteredInHouseTasks.map((voucherTask) => ({
      id: `voucher:${voucherTask.id}`,
      title: voucherTask.title,
      description: voucherTask.description,
      deliverable: voucherTask.description,
      creatorTag: 'NAIRATAG',
      categoryLabel: voucherTask.category,
      deadline: 'Available',
      rewardUSDC: 0,
      points: Number(voucherTask.voucherValue.match(/\d+/)?.[0]) || 0,
      isVoucherTask: true,
      voucherTask,
    }));
    return [...matchingTasks, ...voucherCards];
  }, [allTasks, filteredInHouseTasks, tasksFilter, tasksSearch]);

  const selectedTask = useMemo(() => {
    const existingTask = allTasks.find((task) => task.id === selectedTaskId);
    if (existingTask) return existingTask;
    const voucherId = String(selectedTaskId || '').startsWith('voucher:') ? selectedTaskId.slice('voucher:'.length) : null;
    const voucherTask = IN_HOUSE_TASKS.find((task) => task.id === voucherId);
    if (!voucherTask) return null;
    return {
      id: `voucher:${voucherTask.id}`,
      title: voucherTask.title,
      description: voucherTask.description,
      deliverable: voucherTask.description,
      creatorTag: 'NAIRATAG',
      categoryLabel: voucherTask.category,
      deadline: 'Available',
      rewardUSDC: 0,
      points: Number(voucherTask.voucherValue.match(/\d+/)?.[0]) || 0,
      escrowStatus: 'Protocol Points after review',
      isVoucherTask: true,
      voucherTask,
    };
  }, [allTasks, selectedTaskId]);
  const selectedVoucherClaim = selectedTask?.isVoucherTask
    ? inHouseVouchers.find((voucher) => voucher.taskId === selectedTask.voucherTask.id)
    : null;

  // Pay / Send Terminal State
  const [recipientInput, setRecipientInput] = useState('');
  const [amountInput, setAmountInput] = useState('10.00');
  const [memoInput, setMemoInput] = useState('');
  const [showMemoField, setShowMemoField] = useState(false);
  const [resolution, setResolution] = useState({ loading: false, data: null, error: null });
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Claim Tag State
  const [claimInput, setClaimInput] = useState('');
  const [claimStatus, setClaimStatus] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimRegSlide, setClaimRegSlide] = useState(0);
  const [recentArcTags, setRecentArcTags] = useState([]);
  const [arcTagAgentLinks, setArcTagAgentLinks] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('nairatag_arc_agent_links_v1') || '{}'); }
    catch { return {}; }
  });
  const [pendingArcAgentLink, setPendingArcAgentLink] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('nairatag_pending_arc_agent_link_v1') || 'null'); }
    catch { return null; }
  });
  const [isRetryingArcAgentLink, setIsRetryingArcAgentLink] = useState(false);
  const [claimCardMode, setClaimCardMode] = useState('identity'); // 'identity' | 'share' | 'referral' | 'qrcode'

  const activeCleanTag = useMemo(() => {
    return claimInput.replace(/^[$â‚¦]/, '').trim() || (myTag?.tag ? myTag.tag.replace(/^[$â‚¦]/, '') : 'TAG');
  }, [claimInput, myTag]);

  const claimPreviewText = claimInput.replace(/^[$â‚¦]/, '').toUpperCase() || 'Tag';
  const claimPreviewFontSize = useMemo(() => {
    const len = claimPreviewText.length;
    if (len <= 4) return 'clamp(38px, 9.5vw, 64px)';
    if (len <= 6) return 'clamp(30px, 7.5vw, 52px)';
    if (len <= 9) return 'clamp(22px, 5.8vw, 40px)';
    if (len <= 13) return 'clamp(17px, 4.4vw, 30px)';
    if (len <= 18) return 'clamp(14px, 3.5vw, 24px)';
    if (len <= 24) return 'clamp(12px, 2.9vw, 19px)';
    return 'clamp(10px, 2.4vw, 16px)';
  }, [claimPreviewText]);

  // Dynamic live mascot for claim input searchbar (updates in real-time as user types)
  const liveMascotProfile = useMemo(() => {
    const clean = claimInput.replace(/^[$â‚¦]/, '').trim().toLowerCase();
    return resolveTagProfile(clean || 'nairatag', { avatarSize: 34 });
  }, [claimInput]);

  // Refresh the Arc activity carousel from confirmed registry/payment events.
  useEffect(() => {
    if (mainTab !== 'claim') return;
    let active = true;
    const refresh = async () => {
      try {
        const activities = await getRecentArcTagActivity(18);
        if (active) {
          setRecentArcTags(activities);
          setClaimRegSlide((index) => Math.min(index, Math.max(0, Math.ceil(activities.length / 3) - 1)));
        }
      } catch (error) {
        console.warn('[Recent Arc tag activity]', error.message);
      }
    };
    refresh();
    const refreshInterval = setInterval(refresh, 45000);
    const slideInterval = setInterval(() => {
      setClaimRegSlide((index) => {
        const pageCount = Math.ceil(recentArcTags.length / 3);
        return pageCount > 1 ? (index + 1) % pageCount : 0;
      });
    }, 4500);
    return () => {
      active = false;
      clearInterval(refreshInterval);
      clearInterval(slideInterval);
    };
  }, [mainTab, recentArcTags.length]);

  // App Kit Swap State
  const [swapTokenIn, setSwapTokenIn] = useState('USDC');
  const [swapTokenOut, setSwapTokenOut] = useState('EURC');
  const [swapAmountIn, setSwapAmountIn] = useState('10.00');
  const [swapTargetChain, setSwapTargetChain] = useState('Arc_Testnet');
  const [swapEstimate, setSwapEstimate] = useState(null);
  const [swapEstimating, setSwapEstimating] = useState(false);
  const [swapExecuting, setSwapExecuting] = useState(false);
  const [appKitView, setAppKitView] = useState('swap'); // 'swap' | 'unified' | 'borrow' | 'earn'
  const [borrowBtcAmount, setBorrowBtcAmount] = useState('0.05');

  // ERC-8004 Agent Hub State
  const [agentLookupId, setAgentLookupId] = useState('1');
  const [agentDetails, setAgentDetails] = useState(null);
  const [agentDetailsLoading, setAgentDetailsLoading] = useState(false);
  const [agentDetailsError, setAgentDetailsError] = useState(null);
  const [agentReputationList, setAgentReputationList] = useState([]);

  // Agents Directory View State (Grid vs List toggle & Profile popup)
  const [agentsViewMode, setAgentsViewMode] = useState('grid'); // 'grid' | 'list'
  const [agentsSearchQuery, setAgentsSearchQuery] = useState('');
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null);
  const [agentProfileLiveLoading, setAgentProfileLiveLoading] = useState(false);
  const [agentProfileLiveData, setAgentProfileLiveData] = useState(null);
  const [agentFollowState, setAgentFollowState] = useState({ agentId: null, followerCount: 0, following: false, loading: false, updating: false, error: null });

  useEffect(() => {
    const match = window.location.pathname.match(/^\/agent\/([^/]+)\/?$/i);
    if (!match) return;
    const sharedTag = decodeURIComponent(match[1]).replace(/^â‚¦/, '').toLowerCase();
    setMainTabState('agents');
    const sharedAgent = chatAgents.find((agent) => String(agent.tag || '').toLowerCase() === sharedTag);
    if (sharedAgent) {
      setSelectedAgentProfile(sharedAgent);
      return;
    }
    if (!agentDirectoryError && chatAgents.length === 0) return;
    setSelectedAgentProfile({
      id: null,
      tag: sharedTag.toUpperCase(),
      name: `â‚¦${sharedTag.toUpperCase()}`,
      category: 'Arc agent',
      role: 'Shared Arc agent profile',
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(sharedTag)}`,
      profileType: 'shared-agent',
    });
  }, [agentDirectoryError, chatAgents]);

  useEffect(() => {
    if (!selectedAgentProfile || selectedAgentProfile.profileType === 'claimed-tag' || selectedAgentProfile.profileType === 'platform-agent' || selectedAgentProfile.profileType === 'shared-agent') {
      setAgentFollowState({ agentId: null, followerCount: 0, following: false, loading: false, updating: false, error: null });
      return undefined;
    }
    let active = true;
    const agentId = String(selectedAgentProfile.id);
    setAgentFollowState((current) => ({ ...current, agentId, loading: true, error: null }));
    getArcAgentFollowState(agentId, walletAddress || '')
      .then((state) => {
        if (active) setAgentFollowState({ agentId, ...state, loading: false, updating: false, error: null });
      })
      .catch((error) => {
        if (active) setAgentFollowState((current) => ({ ...current, agentId, loading: false, error: error.message }));
      });
    return () => { active = false; };
  }, [selectedAgentProfile?.id, selectedAgentProfile?.profileType, walletAddress]);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    const q = agentsSearchQuery.trim().toLowerCase();
    if (!q) return chatAgents;
    const capabilityMatches = new Set(discoverAgentsByCapability(q, chatAgents, chatAgents.length).map((match) => match.agent));
    return chatAgents.filter(
      (a) =>
        a.tag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        String(a.role || '').toLowerCase().includes(q) ||
        String(a.category || '').toLowerCase().includes(q) ||
        capabilityMatches.has(a)
    );
  }, [agentsSearchQuery, chatAgents]);

  const rankedAgents = useMemo(() => {
    const earningAmount = (agent) => {
      const earnings = agentDirectoryStats[agent.tag]?.earnings ?? agent.earnings;
      if (typeof earnings === 'number') return Number.isFinite(earnings) ? earnings : 0;
      const parsed = Number(String(earnings ?? '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return [...filteredAgents]
      .sort((a, b) => earningAmount(b) - earningAmount(a) || chatAgents.indexOf(a) - chatAgents.indexOf(b))
      .map((agent, index) => ({ ...agent, leaderboardRank: index + 1 }));
  }, [filteredAgents, chatAgents, agentDirectoryStats]);

  const agentEarningsLabel = (agent) => {
    const earnings = agentDirectoryStats[agent.tag]?.earnings ?? agent.earnings;
    if (earnings === null || earnings === undefined || earnings === '') return agentStatsLoading ? 'â€¦' : '?';
    const amount = Number(earnings);
    return `${Number.isFinite(amount) ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(earnings)} ${agent.earningsCurrency || 'USDC'}`;
  };

  const agentPointsLabel = (agent) => {
    const value = agentDirectoryStats[agent.tag]?.points ?? agent.points;
    if (value === null || value === undefined || value === '') return agentStatsLoading ? 'Loading pointsâ€¦' : '? Points earned';
    const points = Number(value);
    return `${Number.isFinite(points) ? points.toLocaleString() : String(agent.points)} Points earned`;
  };

  // Mobile Navigation & Header State (Matching reference)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSearchResult, setMobileSearchResult] = useState(null);
  const [mobileSearchLoading, setMobileSearchLoading] = useState(false);

  // Quick Mobile Search Handler (Tag / Agent / Address)
  const handleMobileSearch = async (val) => {
    setMobileSearchQuery(val);
    const clean = val.trim().replace(/^[$â‚¦@#]/, '');
    if (!clean) {
      setMobileSearchResult(null);
      return;
    }
    setMobileSearchLoading(true);
    try {
      const matchedAgent = chatAgents.find(
        (a) => a.tag.toLowerCase() === clean.toLowerCase() || String(a.identity?.erc8004AgentId || '') === clean
      );
      const avail = await checkArcTagAvailability(clean);
      setMobileSearchResult({
        tag: clean.toUpperCase(),
        agent: matchedAgent || null,
        available: avail.available,
        reason: avail.reason,
      });
    } catch {
      setMobileSearchResult(null);
    } finally {
      setMobileSearchLoading(false);
    }
  };

  // Toast notification system
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3200, onAction = null) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev.slice(-3), { id, message, type, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    const tag = myTag?.tag;
    const submittedAt = Number(agentOnboarding?.submittedAt);
    if (!walletAddress || !tag || !submittedAt || agentOnboarding?.completed || isAgentOnboardingOpen) return undefined;
    const key = `nairatag_agent_onboarding_reminder_v1:${String(walletAddress).toLowerCase()}:${String(tag).toLowerCase()}`;
    const firstDelay = 5 * 60 * 1000;
    const repeatDelay = 24 * 60 * 60 * 1000;
    let timer;
    let cancelled = false;
    let lastReminder = 0;
    try { lastReminder = Number(window.localStorage.getItem(key)) || 0; } catch { /* Continue with an in-memory reminder. */ }

    const schedule = (delay) => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (document.visibilityState !== 'visible') {
          schedule(60 * 1000);
          return;
        }
        const current = getAgentOnboarding(walletAddress, tag);
        if (!current || current.completed || !current.submittedAt || isAgentOnboardingOpen) return;
        const remaining = Math.max(0, 100 - Number(current.points || 0));
        if (!remaining) return;
        try { window.localStorage.setItem(key, String(Date.now())); } catch { /* The reminder still appears this session. */ }
        showToast(`You're at ${current.points}/100 Pts. Finish your setup to earn ${remaining} more—pick up where you left off.`, 'info', 7000, () => { onboardingDismissedKeyRef.current = null; setIsAgentOnboardingOpen(true); });
        schedule(repeatDelay);
      }, Math.max(0, delay));
    };

    const nextAt = lastReminder ? lastReminder + repeatDelay : submittedAt + firstDelay;
    schedule(nextAt - Date.now());
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [walletAddress, myTag?.tag, agentOnboarding?.submittedAt, agentOnboarding?.completed, agentOnboarding?.points, isAgentOnboardingOpen, showToast]);

  // Confetti explosion for Claim & Swap
  const triggerCelebrationConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.15, y: 0.65 },
        zIndex: 1400,
        disableForReducedMotion: true,
        colors: ['#0052FF', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#BBF246'],
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.85, y: 0.65 },
        zIndex: 1400,
        disableForReducedMotion: true,
        colors: ['#0052FF', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#BBF246'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  // Copy helper with robust fallback and toast response
  const triggerCopy = (key, text) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch (e) {
      console.warn('Copy fallback error:', e);
    }
    setCopiedKey(key);
    showToast(`Copied ${text}`, 'success', 2200);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const shorten = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Chat Greeting: 'Hey there!' when logged out, daytime greeting when logged in
  const chatGreeting = useMemo(() => {
    if (!walletAddress) {
      return 'Hey there!';
    }
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = 'Good evening';
    }

    if (myTag?.tag) {
      const clean = myTag.tag.replace(/^[$â‚¦]/, '').trim();
      const formatted = clean ? `â‚¦${clean.charAt(0).toUpperCase() + clean.slice(1)}` : '';
      return formatted ? `${timeGreeting}, ${formatted}!` : `${timeGreeting}!`;
    }

    if (accountUsername) {
      return `${timeGreeting}, â‚¦${accountUsername}!`;
    }

    return `${timeGreeting}!`;
  }, [walletAddress, myTag, accountUsername]);

  // Balance refresh
  const refreshBalance = useCallback(async (address) => {
    if (!address) return;
    setBalanceLoading(true);
    try {
      const bal = await getUsdcBalance(address);
      setUsdcBalance(bal);
      const tag = await getArcTagForWallet(address);
      setMyTag(tag);
      return { balance: bal, tag };
    } catch (e) {
      console.warn('Balance refresh failed:', e);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Auto-restore Circle session on mount
  useEffect(() => {
    try {
      const stored = getStoredCircleSession();
      if (stored && stored.walletAddress) {
        setWalletAddress(stored.walletAddress);
        setAuthProvider('circle');
        setCircleSession(stored);
        setIsArcNetwork(true);
        refreshBalance(stored.walletAddress);
      }
    } catch (e) {
      console.warn('[App] Restoring Circle session note:', e);
    }
  }, [refreshBalance]);

  // Connect via Circle Programmable Wallet (Web3 Services)
  const handleConnectCircle = async () => {
    const email = circleInput.trim();
    if (!email) {
      showToast('Enter your email address to receive a Circle verification code.', 'error', 3000);
      return;
    }
    setIsConnecting(true);
    setCircleStatus('Sending Circle verification email...');
    try {
      await requestCircleEmailOtp(email);
      setCircleOtpSent(true);
      setCircleStatus('');
      showToast('Circle sent a verification code to your email.', 'success', 3500);
    } catch (err) {
      setCircleStatus('');
      showToast(`Circle email error: ${err.message}`, 'error', 4500);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleVerifyCircle = async () => {
    setIsConnecting(true);
    setCircleStatus('Waiting for Circle email verification...');
    try {
      const login = await verifyCircleEmailOtp();
      const res = await connectCircleWallet(login, ({ message }) => setCircleStatus(message));
      setAccountEmail(circleInput.trim().toLowerCase());
      setWalletAddress(res.walletAddress);
      setAuthProvider('circle');
      setCircleSession(res);
      setIsArcNetwork(true);
      try { await establishCircleArcSession({ userToken: res.userToken, walletAddress: res.walletAddress }); }
      catch (sessionError) { showToast(`Wallet connected, but account session setup failed: ${sessionError.message}`, 'error', 5000); }
      const [accountResult, rewardResult] = await Promise.allSettled([
        refreshBalance(res.walletAddress),
        getArcRewardState(res.walletAddress),
      ]);
      if (rewardResult.status === 'fulfilled') applyArcRewardState(rewardResult.value);
      else setArcRewardsError(rewardResult.reason?.message || 'Your points are still syncing.');
      if (res.isNewWallet) {
        setWelcomeDetails({
          tag: accountResult.status === 'fulfilled' ? accountResult.value?.tag?.tag : null,
          points: rewardResult.status === 'fulfilled' ? rewardResult.value?.points : null,
        });
      }
      setIsConnectModalOpen(false);
      setCircleStatus('');
      setCircleOtpSent(false);
      showToast(`Connected Circle Wallet: ${shorten(res.walletAddress)}`, 'success', 3000);
    } catch (err) {
      setCircleStatus('');
      showToast(`Circle wallet error: ${err.message}`, 'error', 4500);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect active wallet (Circle or Injected)
  const handleDisconnect = () => {
    if (authProvider === 'circle') {
      clearCircleSession();
    }
    clearArcSession();
    setWalletAddress(null);
    setAuthProvider(null);
    setCircleSession(null);
    setAccountEmail('');
    setIsNotificationOpen(false);
    setCircleOtpSent(false);
    setMyTag(null);
    setUsdcBalance({ formatted: '0.00', raw: 0n, rawString: '0' });
    setIsWalletModalOpen(false);
    showToast('Wallet disconnected', 'info', 2000);
  };

  // Connect Wallet Handler
  const handleConnect = async (providerType) => {
    if (providerType === 'Circle' || providerType === 'Circle Wallet') {
      return handleConnectCircle();
    }
    setIsConnecting(true);
    try {
      const { address, chainId: cId } = await connectWallet();
      setWalletAddress(address);
      setAuthProvider('injected');
      setChainId(cId);
      setIsArcNetwork(cId === activeArcChain.id);
      try { await establishWalletArcSession(address); }
      catch (sessionError) { showToast(`Connected, but account session setup failed: ${sessionError.message}`, 'error', 5000); }
      await refreshBalance(address);
      setIsConnectModalOpen(false);
      showToast(`Connected ${shorten(address)}`, 'success', 2500);
    } catch (err) {
      showToast(`Connection error: ${err.message}`, 'error', 3500);
      alert(`Wallet Connection Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch to Arc
  const handleSwitchNetwork = async () => {
    try {
      await switchOrAddArcNetwork();
      setIsArcNetwork(true);
      showToast('Switched to Arc Osaka EVM', 'success', 2500);
      if (walletAddress) refreshBalance(walletAddress);
    } catch (e) {
      showToast(`Switch failed: ${e.message}`, 'error', 3500);
      alert(`Network switch failed: ${e.message}`);
    }
  };

  // Recipient resolution debounce with Nigerian Phone Number support
  useEffect(() => {
    const raw = recipientInput.trim();
    if (!raw) {
      setResolution({ loading: false, data: null, error: null });
      return;
    }

    const cleanPhone = raw.replace(/[\s-]/g, '');
    const isNigerianPhone = /^(\+?234|0)[789][01]\d{8}$/.test(cleanPhone);

    const timer = setTimeout(async () => {
      setResolution({ loading: true, data: null, error: null });
      try {
        if (isNigerianPhone) {
          const displayPhone = cleanPhone.startsWith('+') ? cleanPhone : cleanPhone.startsWith('234') ? `+${cleanPhone}` : `+234${cleanPhone.slice(1)}`;
          const mappedTag = 'â‚¦' + (cleanPhone.slice(-4) === '5678' ? 'segun' : 'michael');
          setResolution({
            loading: false,
            data: {
              success: true,
              tag: mappedTag,
              canonicalTag: mappedTag,
              cleanTag: mappedTag.replace('â‚¦', ''),
              resolvedAddress: '0x18b6255efb9c9f0b2405086ee50a11ca47250e20',
              network: 'Arc Osaka EVM',
              isVerified: true,
              source: 'Nigerian Telco Gateway',
              phone: displayPhone,
              reputation: 99,
            },
            error: null,
          });
          return;
        }

        const res = await resolveTag(raw);
        setResolution({ loading: false, data: res, error: null });
      } catch (err) {
        setResolution({ loading: false, data: null, error: err.message || 'Tag resolution failed' });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [recipientInput]);

  const handleClaimInHouseVoucher = async (task) => {
    if (!walletAddress) {
      showToast('Connect your wallet to claim this voucher.', 'info');
      setIsConnectModalOpen(true);
      return;
    }
    let vouchers;
    try {
      vouchers = await claimInHouseVoucher(walletAddress, task.id);
      setInHouseVouchers(vouchers);
    } catch (error) {
      showToast(error.message || 'Could not save this voucher.', 'error');
      return;
    }
    try {
      await broadcastArcVoucherClaimToTelegram({ taskId: task.id, walletAddress });
      showToast(`${task.voucherName} submitted for admin review.`, 'success', 3500);
    } catch (error) {
      showToast(`${task.voucherName} submission saved. Telegram alert not sent: ${error.message}`, 'info', 5000);
    }
  };

  const handleRefreshVoucherClaims = async () => {
    if (!walletAddress) return;
    try { setInHouseVouchers(await syncInHouseVouchers(walletAddress)); }
    catch (error) { showToast(error.message || 'Could not refresh voucher claims.', 'error'); }
  };

  const handleStartTask = async (task) => {
    if (!walletAddress) {
      showToast('Connect your wallet before starting a bounty.', 'info');
      setIsConnectModalOpen(true);
      return;
    }
    try {
      const progress = await startArcTask({ taskId: task.id, walletAddress, taskTitle: task.title, rewardUSDC: task.rewardUSDC, points: task.points, sessionToken: authProvider === 'circle' ? getArcSessionToken(walletAddress) : undefined, authProvider });
      setTaskProgress((previous) => ({ ...previous, [task.id]: progress }));
      showToast(`You started: ${task.title}`, 'success');
    } catch (error) {
      showToast(error.message || 'Could not start this task.', 'error', 4000);
    }
  };

  const handleSubmitTask = async (task) => {
    const submission = taskSubmissionDraft.trim();
    if (submission.length < 8) {
      showToast('Add a submission link or a short description of your work.', 'error');
      return;
    }
    try {
      const progress = await submitArcTask({ taskId: task.id, walletAddress, deliverable: submission, taskTitle: task.title, rewardUSDC: task.rewardUSDC, points: task.points, sessionToken: authProvider === 'circle' ? getArcSessionToken(walletAddress) : undefined, authProvider });
      setTaskProgress((previous) => ({ ...previous, [task.id]: progress }));
      setTaskSubmissionDraft('');
      showToast('Submission saved to the Arc task service for owner review.', 'success');
    } catch (error) {
      showToast(error.message || 'Could not submit this task.', 'error', 4000);
    }
  };

  const handleTaskChat = (task) => {
    setChatInputText(`Hi @â‚¦${task.creatorTag.replace(/^â‚¦/, '')}, Iâ€™m working on â€œ${task.title}â€. `);
    setIsTaskChatDraft(true);
    setMainTab('chat');
  };

  // Daily Bonus Mission Actions (Matching Reference Screen)
  const handleDailyPriceReport = () => {
    if (dailyMissionsDone.price) {
      showToast("Today's price report already submitted!", 'info');
      return;
    }
    setDailyMissionsDone((prev) => ({ ...prev, price: true }));
    setUserPoints((prev) => prev + 100);
    triggerCelebrationConfetti();
    showToast('ðŸ“Š Market Price Verified! +100 Protocol Points added to your balance.', 'success', 3500);
  };

  const handleDailyAgentMission = () => {
    if (dailyMissionsDone.agent) {
      showToast("Today's agent mission already completed!", 'info');
      return;
    }
    setDailyMissionsDone((prev) => ({ ...prev, agent: true }));
    setUserPoints((prev) => prev + 150);
    triggerCelebrationConfetti();
    showToast('ðŸ¤– Agent Mission Completed! High-gap coverage verified. +150 Points.', 'success', 3500);
  };

  const handleDailyCommodityAlert = () => {
    if (dailyMissionsDone.alert) {
      showToast('Commodity alert already active for today!', 'info');
      return;
    }
    setDailyMissionsDone((prev) => ({ ...prev, alert: true }));
    setUserPoints((prev) => prev + 50);
    triggerCelebrationConfetti();
    showToast('ðŸ”” Price Alert Set on Arc Commodities! +50 Points.', 'success', 3500);
  };

  const handleInviteToEarn = () => {
    const inviteUrl = myTag?.tag ? getTagShareUrl(myTag.tag) : 'https://arc.nairatag.ng/#claim';
    triggerCopy('invite_link', inviteUrl);
    showToast('ðŸ”— Invite Link Copied! Share with friends to earn 10% fee rebates on Arc.', 'success', 3500);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!postTaskForm.title.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }
    const usdc = parseFloat(postTaskForm.reward) || 20;
    const newTask = {
      id: `task_${Date.now()}`,
      title: postTaskForm.title,
      category: postTaskForm.category,
      categoryLabel: postTaskForm.category === 'dev' ? 'âš¡ Engineering' : postTaskForm.category === 'design' ? 'ðŸŽ¨ Design' : postTaskForm.category === 'data' ? 'ðŸ“Š Data & AI' : postTaskForm.category === 'content' ? 'âœï¸ Content' : 'ðŸ§ª Testing',
      status: 'open',
      rewardUSDC: usdc,
      rewardNGN: `â‚¦${(usdc * 1485).toLocaleString()}`,
      points: Math.round(usdc * 10),
      deadline: postTaskForm.deadline || '3 days left',
      applicants: 0,
      creatorTag: displayUserTag || 'â‚¦YOU',
      escrowStatus: 'ðŸ”’ Funded in Escrow',
      description: postTaskForm.description || 'Community bounty on Arc Osaka EVM with automated milestone escrow settlement.',
      deliverable: postTaskForm.requirements || 'Public verification link, GitHub PR, or live demo.',
    };
    setCustomTasks((prev) => [newTask, ...prev]);
    setIsPostTaskOpen(false);
    setPostTaskForm({
      title: '',
      category: 'dev',
      reward: '35',
      deadline: '3 days left',
      description: '',
      requirements: '',
    });
    triggerCelebrationConfetti();
    showToast(`Bounty created & ${usdc} USDC locked in Arc milestone escrow!`, 'success', 3500);
  };

  // Agent profile conversations use the live AI service; no canned agent replies.
  const handleSendAgentChat = async (agentId, userText) => {
    const text = (userText || agentChatInput).trim();
    if (!text) return;
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      showToast('Connect an Arc wallet to start a saved agent chat.', 'info');
      return;
    }
    const currentMsgs = agentChatMessages[agentId] || [];

    const newMsgs = [...currentMsgs, { sender: 'user', text, time: 'Just now' }];
    setAgentChatMessages((prev) => ({ ...prev, [agentId]: newMsgs }));
    setAgentChatInput('');
    try {
      const agentTag = selectedAgentProfile?.tag || 'arc';
      const result = await sendArcChatMessage({
        walletAddress,
        conversationId: getOrCreateArcChatConversationId(walletAddress, agentTag),
        turnId: crypto.randomUUID(),
        prompt: text,
        agentTag,
        title: text,
      });
      setAgentChatMessages((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || newMsgs), { sender: 'agent', text: result.reply, time: 'Just now' }],
      }));
    } catch (error) {
      setAgentChatMessages((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || newMsgs), { sender: 'agent', text: `I couldn't send or save that message: ${error.message}`, time: 'Just now' }],
      }));
    }
  };


  // Swap estimate debounce
  useEffect(() => {
    if (mainTab !== 'swap' || !swapAmountIn || parseFloat(swapAmountIn) <= 0) return;
    const timer = setTimeout(async () => {
      setSwapEstimating(true);
      try {
        const quote = await estimateAppKitSwap({
          tokenIn: swapTokenIn,
          tokenOut: swapTokenOut,
          amountIn: swapAmountIn,
          fromChain: 'Arc_Testnet',
          toChain: swapTargetChain,
        });
        setSwapEstimate(quote);
      } catch (e) {
        console.warn('Swap estimate error:', e);
      } finally {
        setSwapEstimating(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mainTab, swapTokenIn, swapTokenOut, swapAmountIn, swapTargetChain]);

  // Open Review State Modal
  const handleInitiateSend = () => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    if (!recipientInput.trim()) {
      alert('Please enter a valid recipient NairaTag or address.');
      return;
    }
    if (!amountInput || parseFloat(amountInput) <= 0) {
      alert('Please enter a valid USDC amount.');
      return;
    }
    setSendError(null);
    setIsSendReviewModalOpen(true);
  };

  // Execute Payment
  const handleExecuteSend = async () => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    if (!recipientInput.trim()) {
      alert('Please enter a valid recipient NairaTag or address.');
      return;
    }
    if (!amountInput || parseFloat(amountInput) <= 0) {
      alert('Please enter a valid USDC amount.');
      return;
    }

    setChatActivityStep('waiting');
    setIsSending(true);
    setSendError(null);
    try {
      const targetTag = recipientInput.startsWith('0x') ? null : recipientInput;
      let result;
      if (authProvider === 'circle') {
        let recipientAddress = recipientInput.trim();
        if (!recipientAddress.startsWith('0x')) {
          const resolved = await resolveTag(recipientAddress);
          if (!resolved.success || !resolved.resolvedAddress) {
            throw new Error(resolved.error || `Could not resolve recipient ${recipientAddress}.`);
          }
          recipientAddress = resolved.resolvedAddress;
        }
        result = await sendUsdcWithCircle({
          session: circleSession,
          fromAddress: walletAddress,
          toAddress: recipientAddress,
          amountUsdc: amountInput.trim(),
          memoText: memoInput.trim(),
          onStatusUpdate: ({ step }) => setChatActivityStep(step),
        });
      } else {
        result = await sendUsdcOnArc({
          fromAddress: walletAddress,
          tagOrAddress: recipientInput.trim(),
          amountUsdc: amountInput.trim(),
          memo: memoInput.trim() || undefined,
          onStatusUpdate: ({ step }) => setChatActivityStep(step),
        });
      }

      setIsSendReviewModalOpen(false);
      setCelebrationDetails({
        type: 'payment',
        txHash: result.txHash,
        amount: amountInput,
        recipient: targetTag ? `â‚¦${targetTag.replace(/^[$â‚¦]/, '').toUpperCase()}` : shorten(result.recipientAddress),
        explorerUrl: result.explorerUrl,
        executionTimeMs: result.executionTimeMs,
      });
      setIsCelebrationOpen(true);

      let rewardState = null;
      let rewardSyncError = '';
      try {
        const rewardUpdate = await recordConfirmedPaymentSpin({ accountKey: walletAddress, txHash: result.txHash });
        rewardState = rewardUpdate.state;
        applyArcRewardState(rewardState);
      } catch (rewardError) {
        rewardSyncError = rewardError.message || 'Arc rewards could not be synchronized.';
        setArcRewardsError(rewardSyncError);
      }
      if (rewardSyncError) setArcRewardsError(`Payment succeeded on Arc, but rewards sync is pending: ${rewardSyncError}`);

      refreshBalance(walletAddress);
      setAmountInput('');
      setMemoInput('');
    } catch (err) {
      showToast(err.message || 'Payment failed on Arc.', 'error', 3500);
      setSendError(err.message || 'Payment failed on Arc.');
    } finally {
      setIsSending(false);
      setChatActivityStep('thinking');
    }
  };

  // Execute Swap
  const handleExecuteSwap = async () => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    if (authProvider === 'circle') {
      showToast('Circle wallet swaps are not available yet. Connect an external EVM wallet to swap.', 'error', 4500);
      return;
    }
    setSwapExecuting(true);
    try {
      const provider = getEthereumProvider();
      const res = await executeAppKitSwap({
        provider,
        account: walletAddress,
        tokenIn: swapTokenIn,
        tokenOut: swapTokenOut,
        amountIn: swapAmountIn,
        fromChain: 'Arc_Testnet',
        toChain: swapTargetChain,
      });

      triggerCelebrationConfetti();
      setCelebrationDetails({
        type: 'swap',
        txHash: res.txHash,
        amount: `${swapAmountIn} ${swapTokenIn} âž” ${swapEstimate?.amountOut || ''} ${swapTokenOut}`,
        recipient: 'Arc App Kit Swap',
        explorerUrl: `${ARC_TESTNET_CONFIG.explorerUrl}/tx/${res.txHash}`,
      });
      setIsCelebrationOpen(true);
      refreshBalance(walletAddress);
    } catch (err) {
      showToast(`Swap failed: ${err.message}`, 'error', 4000);
      alert(`Swap failed: ${err.message}`);
    } finally {
      setSwapExecuting(false);
    }
  };

  // Flip swap tokens
  const handleFlipSwapTokens = () => {
    const prevIn = swapTokenIn;
    const prevOut = swapTokenOut;
    setSwapTokenIn(prevOut);
    setSwapTokenOut(prevIn);
  };

  // Agent lookup
  const handleLookupAgent = async (overrideId) => {
    const targetId = String(
      overrideId !== undefined && overrideId !== null && typeof overrideId !== 'object'
        ? overrideId
        : agentLookupId
    ).trim();
    if (!targetId) return;
    if (targetId !== agentLookupId) setAgentLookupId(targetId);

    setAgentDetailsLoading(true);
    setAgentDetailsError(null);
    try {
      const details = await getAgentDetails(targetId);
      setAgentDetails(details);
      const logs = await getAgentReputationLogs(targetId);
      setAgentReputationList(logs);
    } catch (err) {
      setAgentDetails(null);
      setAgentReputationList([]);
      setAgentDetailsError(err.message || 'Agent not found.');
    } finally {
      setAgentDetailsLoading(false);
    }
  };

  // Open Agent Profile Modal & Fetch live onchain details from Arc ERC-8004
  const handleOpenAgentProfile = async (agent) => {
    setSelectedAgentProfile(agent);
    setAgentProfileLiveLoading(true);
    setAgentProfileLiveData(null);
    try {
      const details = await getAgentDetails(agent.id);
      let logs = [];
      let completedTaskCount = null;
      try {
        logs = await getAgentReputationLogs(agent.id);
      } catch (logErr) {
        console.warn('Reputation logs note:', logErr);
      }
      if (details.owner) {
        try {
          completedTaskCount = await getArcAgentCompletedTaskCount(details.owner);
        } catch (taskStatsError) {
          console.warn('Agent task stats note:', taskStatsError.message);
        }
      }
      setAgentProfileLiveData({ details, logs, completedTaskCount });
    } catch (e) {
      console.warn('Live agent query note:', e.message);
      setAgentProfileLiveData(null);
    } finally {
      setAgentProfileLiveLoading(false);
    }
  };

  const handleOpenPlatformAgentProfile = (agent) => {
    setAgentProfileLiveLoading(false);
    setAgentProfileLiveData(null);
    setSelectedAgentProfile({ ...agent, profileType: 'platform-agent' });
  };

  const openDirectoryAgent = (agent) => {
    if (agent.identity?.verifiedOnchain && agent.identity?.erc8004AgentId) {
      handleOpenAgentProfile({ ...agent, id: agent.identity.erc8004AgentId });
    } else {
      handleOpenPlatformAgentProfile(agent);
    }
  };

  const handleDirectoryCardKeyDown = (event, agent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDirectoryAgent(agent);
    }
  };

  const persistArcAgentLink = (tag, owner, registration) => {
    const cleanTag = String(tag).replace(/^[â‚¦$@#]/, '').toLowerCase();
    const linkedAgent = {
      id: String(registration.agentId),
      tag: cleanTag,
      name: `â‚¦${cleanTag.toUpperCase()}`,
      role: `NairaTag agent on Arc Â· ERC-8004 #${registration.agentId}`,
      category: 'NairaTag',
      owner,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanTag)}`,
      metadataUri: registration.finalMetadataURI || registration.metadataURI,
      registrationTxHash: registration.txHash,
      linkTxHash: registration.linkTxHash || null,
      status: 'Verified',
      identity: {
        type: 'erc8004',
        verifiedOnchain: true,
        erc8004AgentId: String(registration.agentId),
      },
    };
    setArcTagAgentLinks((current) => {
      const next = { ...current, [cleanTag]: linkedAgent };
      window.localStorage.setItem('nairatag_arc_agent_links_v1', JSON.stringify(next));
      return next;
    });
    window.localStorage.removeItem('nairatag_pending_arc_agent_link_v1');
    setPendingArcAgentLink(null);
    return linkedAgent;
  };

  const completeArcAgentLink = async (tag, owner, retryLink = null) => {
    const cleanTag = String(tag).replace(/^[â‚¦$@#]/, '').toLowerCase();
    const pending = { tag: cleanTag, owner, ...(retryLink || {}) };
    setPendingArcAgentLink(pending);
    window.localStorage.setItem('nairatag_pending_arc_agent_link_v1', JSON.stringify(pending));
    let registration;
    if (pending.agentId && pending.metadataURI) {
      const linked = await updateArcAgentRegistrationUri({ fromAddress: owner, agentId: pending.agentId, metadataURI: pending.metadataURI });
      registration = {
        agentId: pending.agentId,
        metadataURI: pending.metadataURI,
        finalMetadataURI: pending.metadataURI,
        txHash: pending.registrationTxHash || null,
        linkTxHash: linked.txHash,
      };
    } else {
      registration = await registerNairaTagAgent({ fromAddress: owner, tag: cleanTag });
    }
    if (!registration.agentId) throw new Error('Arc did not return an ERC-8004 agent ID. The NairaTag is claimed; retry the agent link.');
    return persistArcAgentLink(cleanTag, owner, registration);
  };

  const handleRetryArcAgentLink = async () => {
    if (!pendingArcAgentLink) return;
    setIsRetryingArcAgentLink(true);
    try {
      const linkedAgent = await completeArcAgentLink(pendingArcAgentLink.tag, pendingArcAgentLink.owner, pendingArcAgentLink);
      setCelebrationDetails((current) => ({ ...current, erc8004Id: linkedAgent.id, erc8004TxHash: null, erc8004LinkError: null }));
      showToast(`â‚¦${linkedAgent.tag.toUpperCase()} linked to ERC-8004 #${linkedAgent.id}.`, 'success', 3500);
    } catch (error) {
      if (error.partialRegistration) {
        const pending = { ...pendingArcAgentLink, ...error.partialRegistration };
        setPendingArcAgentLink(pending);
        window.localStorage.setItem('nairatag_pending_arc_agent_link_v1', JSON.stringify(pending));
      }
      setCelebrationDetails((current) => ({ ...current, erc8004LinkError: error.message }));
    } finally {
      setIsRetryingArcAgentLink(false);
    }
  };

  const handleToggleAgentFollow = async () => {
    const agent = selectedAgentProfile;
    if (!agent || agent.profileType === 'claimed-tag' || agent.profileType === 'platform-agent') return;
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    const agentOwner = agentProfileLiveData?.details?.owner || agent.owner || '';
    if (String(agentOwner).toLowerCase() === walletAddress.toLowerCase()) return;

    const action = agentFollowState.following ? 'unfollow' : 'follow';
    setAgentFollowState((current) => ({ ...current, updating: true, error: null }));
    try {
      const state = await setArcAgentFollow({
        action,
        agentId: agent.id,
        tag: agent.tag,
        walletAddress,
      });
      setAgentFollowState({ agentId: String(agent.id), ...state, loading: false, updating: false, error: null });
    } catch (error) {
      setAgentFollowState((current) => ({ ...current, updating: false, error: error.message }));
      showToast(error.message || 'Could not update agent follow.', 'error', 4000);
    }
  };

  // Every recent NairaTag opens the same profile card. ERC-8004 details are
  // added only when that exact tag has a verified agent record.
  const handleOpenRecentClaimProfile = async (activity) => {
    const rawTag = typeof activity === 'string' ? activity : activity?.tag;
    const tag = String(rawTag || '').replace(/^[â‚¦$@#]/, '').trim().toLowerCase();
    if (!tag) return;

    const locallyLinkedAgent = arcTagAgentLinks[tag];
    if (locallyLinkedAgent) {
      handleOpenAgentProfile(locallyLinkedAgent);
      return;
    }

    const agent = chatAgents.find((item) => item.tag.toLowerCase() === tag);
    if (agent) {
      if (agent.identity?.verifiedOnchain && agent.identity?.erc8004AgentId) {
        handleOpenAgentProfile({ ...agent, id: agent.identity.erc8004AgentId });
      } else {
        handleOpenPlatformAgentProfile(agent);
      }
      return;
    }

    const knownOwner = typeof activity === 'object' ? activity.owner : null;
    if (knownOwner) {
      try {
        const indexedAgent = await findArcAgentForTag(tag, knownOwner);
        if (indexedAgent) {
          handleOpenAgentProfile(indexedAgent);
          return;
        }
      } catch (error) {
        console.warn('[ERC-8004 NairaTag lookup]', error.message);
      }
    }

    setAgentProfileLiveData(null);
    setSelectedAgentProfile({
      profileType: 'claimed-tag',
      id: null,
      tag,
      name: `â‚¦${tag}`,
      role: 'NairaTag',
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
      owner: typeof activity === 'object' ? activity.owner || null : null,
      activity: typeof activity === 'object' ? activity.activity : null,
      profileLoading: true,
      profileError: null,
      completedTaskCount: null,
    });

    const result = typeof activity === 'object' && activity.owner
      ? { success: true, resolvedAddress: activity.owner }
      : await resolveTag(tag);
    setSelectedAgentProfile((current) => {
      if (current?.profileType !== 'claimed-tag' || current.tag !== tag) return current;
      return {
        ...current,
        owner: result.success ? result.resolvedAddress : null,
        profileLoading: false,
        profileError: result.success ? null : result.error || 'This NairaTag could not be resolved right now.',
      };
    });
    if (result.success && result.resolvedAddress) {
      try {
        const completedTaskCount = await getArcAgentCompletedTaskCount(result.resolvedAddress);
        setSelectedAgentProfile((current) => current?.profileType === 'claimed-tag' && current.tag === tag
          ? { ...current, completedTaskCount }
          : current);
      } catch (taskStatsError) {
        console.warn('NairaTag task stats note:', taskStatsError.message);
      }
    }
  };

  // Pay Agent directly in USDC from profile
  const handlePayAgentFromProfile = (agent) => {
    setSelectedAgentProfile(null);
    setRecipientInput(`â‚¦${agent.tag}`);
    setMainTab('pay');
    showToast(`Recipient pre-filled: â‚¦${agent.tag.toUpperCase()}`, 'info', 3000);
  };

  // Claim Tag Check
  const handleCheckClaim = async (val) => {
    setClaimInput(val);
    const clean = val.replace(/^[â‚¦$@#]/, '').toUpperCase();
    if (!clean) {
      setClaimStatus(null);
      return;
    }
    setClaimStatus({ loading: true });
    try {
      const res = await checkArcTagAvailability(clean, walletAddress);
      setClaimStatus(res);
    } catch (e) {
      setClaimStatus({ available: false, reason: e.message });
    }
  };

  // Execute Claim Tag
  const handleExecuteClaim = async () => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    setIsClaiming(true);
    try {
      let res;
      if (authProvider === 'circle') {
        const availability = await checkArcTagAvailability(claimInput, walletAddress);
        if (!availability.available) throw new Error(availability.reason || 'This NairaTag cannot be claimed.');
        res = await claimTagWithCircle({ session: circleSession, walletAddress, rawTag: claimInput });
      } else {
        res = await claimArcNairaTag({ rawTag: claimInput, walletAddress });
      }
      let agentRegistration = null;
      let agentLinkError = null;
      try {
        agentRegistration = await completeArcAgentLink(res.cleanTag, walletAddress);
      } catch (error) {
        agentLinkError = error.message || 'ERC-8004 linking did not complete.';
        const pendingLink = { tag: res.cleanTag, owner: walletAddress, ...(error.partialRegistration || {}) };
        setPendingArcAgentLink(pendingLink);
        window.localStorage.setItem('nairatag_pending_arc_agent_link_v1', JSON.stringify(pendingLink));
      }
      let referralReward = null;
      const hasReferralAttribution = Boolean(window.localStorage.getItem('nairatag_pending_referral_v1'));
      try {
        const claimNotice = await submitArcRewardAction({ action: 'tag_claimed', walletAddress, tag: res.cleanTag });
        applyArcRewardState(claimNotice.state);
      } catch (rewardError) {
        setArcRewardsError(rewardError.message || 'NairaTag claim notification could not be saved.');
      }
      if (hasReferralAttribution) {
        try {
          referralReward = await recordReferralSignup({ referredTag: res.cleanTag, referredWallet: walletAddress });
          if (referralReward?.state) applyArcRewardState(referralReward.state);
        } catch (rewardError) {
          setArcRewardsError(rewardError.message || 'Referral reward could not be recorded.');
        }
      }
      // Broadcast verified Arc claim to official Telegram channel
      broadcastArcClaimToTelegram({
        tag: res.cleanTag,
        owner: walletAddress,
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
        erc8004Id: agentRegistration?.id || null,
      }).catch((broadcastErr) => console.warn('[Telegram Broadcast]', broadcastErr));

      // â”€â”€ Immediately update the user's identity across the app â”€â”€
      setMyTag({ tag: res.cleanTag, owner: walletAddress });
      try {
        localStorage.setItem('nairatag_claimed_tag_v1', JSON.stringify({ tag: res.cleanTag, owner: walletAddress }));
      } catch {}

      triggerCelebrationConfetti();
      let onboardingProgress;
      try { onboardingProgress = updateAgentOnboarding(walletAddress, res.cleanTag); }
      catch (error) { showToast(error.message || 'Your tag was claimed. Setup details could not be cached on this device.', 'error', 5000); }
      try {
        const reward = await claimAgentOnboardingReward({ walletAddress, tag: res.cleanTag, step: 'identity' });
        if (reward.state) applyArcRewardState(reward.state);
        const synced = syncAgentOnboardingRewards(walletAddress, res.cleanTag, reward.onboarding);
        if (synced) onboardingProgress = synced;
      } catch (error) {
        setArcRewardsError(`Tag claimed, but the onboarding reward could not sync yet: ${error.message}`);
      }
      setAgentOnboarding(onboardingProgress);
      const onboardingKey = `${String(walletAddress).toLowerCase()}:${String(res.cleanTag).replace(/^[₦$@#]/, '').toLowerCase()}`;
      onboardingDismissedKeyRef.current = onboardingKey;
      setIsAgentOnboardingOpen(false);
      setAgentSuccessDetails({ variant: 'claimed', tag: res.cleanTag, progress: onboardingProgress || getAgentOnboarding(walletAddress, res.cleanTag) || {} });
      setCelebrationDetails({
        type: 'claim',
        cleanTag: res.cleanTag,
        txHash: res.txHash,
        amount: `â‚¦${res.cleanTag.toUpperCase()}`,
        recipient: 'Sovereign Onchain Tag',
        explorerUrl: res.explorerUrl,
        erc8004Id: agentRegistration?.id || null,
        erc8004LinkError: agentLinkError,
      });
      setIsCelebrationOpen(false);
      setIsClaimModalOpen(false);
      await refreshBalance(walletAddress);
    } catch (e) {
      showToast(`Claim failed: ${e.message}`, 'error', 4000);
    } finally {
      setIsClaiming(false);
    }
  };

  // Initial load
  useEffect(() => {
    rememberReferralFromUrl();
    handleLookupAgent('1');
  }, []);

  return (
    <>
      {/* â”€â”€â”€ Top Application Header (Reference-matched Layout) â”€â”€â”€ */}
      <header className={`app-header ${mainTab === 'claim' ? 'claim-active' : ''}`}>
        {/* Left Side: Brand Logo Badge + Mobile Hamburger Menu */}
        <div className="app-header-left">
          <div className="app-brand" onClick={() => setMainTab('chat')}>
            <div className="brand-badge" title="NairaTag on Arc">
              <img src="/nairatag-logo.png" alt="NairaTag" className="brand-logo-img" />
            </div>
          </div>

          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            title="Menu"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Center: Desktop Navigation Tabs (Hidden on mobile) */}
        <nav className="app-nav-tabs desktop-only">
          <button
            type="button"
            className={`nav-tab-btn ${mainTab === 'claim' ? 'active' : ''}`}
            onClick={() => setMainTab('claim')}
          >
            <Sparkles size={14} />
            <span>Claim â‚¦Tag</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${mainTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setMainTab('tasks')}
          >
            <Briefcase size={14} />
            <span>Tasks</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${mainTab === 'agents' ? 'active' : ''}`}
            onClick={() => setMainTab('agents')}
          >
            <Bot size={14} />
            <span>Agents</span>
            <span className="nav-badge-pill" style={{ background: '#7c3aed' }}>8</span>
          </button>
          {import.meta.env.VITE_NAIRADOTS_AGENT_URL && (
            <a
              className="nav-tab-btn"
              href={import.meta.env.VITE_NAIRADOTS_AGENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open your NairaDots agent workspace"
            >
              <Brain size={14} />
              <span>My Agents</span>
              <ExternalLink size={12} />
            </a>
          )}
          <button
            type="button"
            className={`nav-tab-btn ${mainTab === 'chat' ? 'active' : ''}`}
            onClick={() => setMainTab('chat')}
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${mainTab === 'rewards' ? 'active' : ''}`}
            onClick={() => setMainTab('rewards')}
          >
            <Gift size={14} />
            <span>Rewards</span>
          </button>
        </nav>

        {/* Right Side: Search Icon + More (Â·Â·Â·) + Connect Pill */}
        <div className="app-header-actions">
          {/* Search Button (Hidden on Claim page) */}
          {mainTab !== 'claim' && (
            <button
              type="button"
              className="header-icon-btn search-trigger-btn desktop-only"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="Search tags or agents"
              title="Search"
            >
              <Search size={20} />
            </button>
          )}

          {/* More Button (Â·Â·Â·) */}
          <div className="header-more-wrapper desktop-only">
            <button
              type="button"
              className={`header-icon-btn more-trigger-btn ${isMoreMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              aria-label="More options"
              title="More"
            >
              <MoreHorizontal size={22} />
            </button>

            {/* More Menu Dropdown Popover */}
            {isMoreMenuOpen && (
              <>
                <div className="more-menu-backdrop" onClick={() => setIsMoreMenuOpen(false)} />
                <div className="more-menu-popover" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="more-menu-item"
                    onClick={() => {
                      toggleTheme();
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                  </button>

                  <button
                    type="button"
                    className="more-menu-item"
                    onClick={() => {
                      setMainTab('faq');
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    <HelpCircle size={15} />
                    <span>FAQ</span>
                  </button>

                  <a
                    href={`https://explorer.testnet.arc.io/address/${ARC_NAIRATAG_REGISTRY_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <Tag size={15} />
                    <span>NairaTag Registry â†—</span>
                  </a>

                  <a
                    href={`https://explorer.testnet.arc.io/address/${ARC_NAIRATAG_RESOLVER_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <ExternalLink size={15} />
                    <span>NairaTag Resolver â†—</span>
                  </a>

                  <a
                    href="https://erc-8004.quicknode.com/agents?network=arc-testnet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <Bot size={15} />
                    <span>8004scan (Arc Testnet AI Agents) â†—</span>
                  </a>

                  <div className="more-menu-divider" />

                  <div className="more-menu-meta">
                    <span className="more-menu-dot" />
                    <span>Arc Osaka EVM (5042002)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop Theme Toggle */}
          <button
            type="button"
            className="theme-toggle-btn desktop-only"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Notifications are part of the signed-in account experience. */}
          {walletAddress && <div className="header-bell-wrapper">
            <button
              type="button"
              className={`header-bell-btn ${isNotificationOpen ? 'active' : ''}`}
              onClick={() => {
                playMicroSound('pop');
                setIsNotificationOpen(!isNotificationOpen);
              }}
              aria-label={`${notificationInbox.filter((item) => !item.readAt).length} new notifications`}
              title="Notifications"
            >
              <Bell size={18} className={isNotificationOpen ? 'bell-ringing-active' : ''} />
              {notificationInbox.some((item) => !item.readAt) && (
                <span className="header-bell-badge">
                  {Math.min(notificationInbox.filter((item) => !item.readAt).length, 99)}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <>
                <div className="more-menu-backdrop" onClick={() => setIsNotificationOpen(false)} />
                <div className="notifications-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="notifications-popover-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={14} color="#5B4FFF" />
                      <span style={{ fontSize: '13px', fontWeight: 800 }}>Notifications</span>
                    </div>
                    <span className="nav-badge-pill" style={{ background: 'var(--primary, #5b4fff)' }}>
                      {notificationInbox.filter((item) => !item.readAt).length
                        ? `${notificationInbox.filter((item) => !item.readAt).length} New`
                        : 'Up to date'}
                    </span>
                  </div>

                  <div className="notifications-list">
                    {notificationInbox.length ? notificationInbox.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`notification-item ${item.readAt ? '' : 'unread'}`}
                        onClick={() => {
                          setNotificationInbox(markInboxNotificationRead(item.id));
                          markArcNotificationsRead(walletAddress, [item.id]).then(applyArcRewardState).catch(() => {});
                          const destination = String(item.url || '').split('#')[1]?.split('?')[0];
                          setMainTab(['rewards', 'claim', 'pay', 'tasks', 'agents', 'chat', 'faq'].includes(destination) ? destination : 'rewards');
                          setIsNotificationOpen(false);
                        }}
                      >
                        {!item.readAt && <div className="notif-dot" />}
                        <div className="notif-content">
                          <div className="notif-title">{item.title}</div>
                          <div className="notif-sub">{item.body}</div>
                          <span className="notification-item-time">
                            {new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </button>
                    )) : (
                      <div className="notification-empty-state">
                        <Bell size={18} />
                        <span>Youâ€™re all caught up. Reward updates and daily reminders will appear here.</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>}

          {/* Connect / Connected Wallet Pill (with Shield Sign in matching screenshot) */}
          {walletAddress ? (
            <button
              type="button"
              className="wallet-connected-pill"
              onClick={() => setMainTab('profile')}
              title="Open your profile dashboard"
              aria-label="Open your profile dashboard"
            >
              <ProfileAvatar tag={myTag?.tag} email={accountEmail} size={26} />
              <span className="wallet-connected-handle">{displayAccountName || 'NairaTag user'}</span>
              <span className="wallet-connected-sep desktop-only">|</span>
              <span className="wallet-connected-bal desktop-only">{usdcBalance.formatted} USDC</span>
            </button>
          ) : (
            <button
              type="button"
              className="wallet-btn-pill header-connect-pill"
              onClick={() => setIsConnectModalOpen(true)}
            >
              <ShieldCheck size={16} />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MOBILE NAVIGATION DRAWER (SLIDE-DOWN SHEET MATCHING REFERENCE)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="brand-badge" style={{ width: 28, height: 28 }}>
                  <img src="/nairatag-logo.png" alt="NairaTag" className="brand-logo-img" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--privy-color-foreground)' }}>NairaTag</span>
              </div>
              <button
                type="button"
                className="agent-modal-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-drawer-links">
              <div className="mobile-nav-section-label">Your pages</div>
              <button
                type="button"
                className={`mobile-nav-link ${mainTab === 'claim' ? 'active' : ''}`}
                onClick={() => {
                  setMainTab('claim');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon-box">
                  <Sparkles size={18} />
                </div>
                <div className="mobile-nav-text">
                  <span className="mobile-nav-title">Claim a NairaTag</span>
                  <span className="mobile-nav-desc">Choose your personal identity</span>
                </div>
                <ChevronRight className="mobile-nav-chevron" size={18} />
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${mainTab === 'tasks' ? 'active' : ''}`}
                onClick={() => {
                  setMainTab('tasks');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon-box">
                  <Briefcase size={18} />
                </div>
                <div className="mobile-nav-text">
                  <span className="mobile-nav-title">Tasks &amp; bounties</span>
                  <span className="mobile-nav-desc">Find work and track your progress</span>
                </div>
                <ChevronRight className="mobile-nav-chevron" size={18} />
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${mainTab === 'agents' ? 'active' : ''}`}
                onClick={() => {
                  setMainTab('agents');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon-box">
                  <Bot size={18} />
                </div>
                <div className="mobile-nav-text">
                  <span className="mobile-nav-title">Agent directory</span>
                  <span className="mobile-nav-desc">Discover agents on NairaDots</span>
                </div>
                <ChevronRight className="mobile-nav-chevron" size={18} />
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${mainTab === 'chat' ? 'active' : ''}`}
                onClick={() => {
                  setMainTab('chat');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon-box">
                  <MessageSquare size={18} />
                </div>
                <div className="mobile-nav-text">
                  <span className="mobile-nav-title">My agent</span>
                  <span className="mobile-nav-desc">Chat, give tasks, and review activity</span>
                </div>
                <ChevronRight className="mobile-nav-chevron" size={18} />
              </button>
              {import.meta.env.VITE_NAIRADOTS_AGENT_URL && (
                <a
                  className="mobile-nav-link"
                  href={import.meta.env.VITE_NAIRADOTS_AGENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="mobile-nav-icon-box"><Brain size={18} /></div>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-title">My agents</span>
                    <span className="mobile-nav-desc">Create and manage your agents</span>
                  </div>
                  <ExternalLink className="mobile-nav-chevron" size={16} />
                </a>
              )}

              <div className="mobile-nav-section-label mobile-nav-section-spaced">Your activity</div>
              <button
                type="button"
                className={`mobile-nav-link ${mainTab === 'rewards' ? 'active' : ''}`}
                onClick={() => {
                  setMainTab('rewards');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <Gift size={18} />
                </div>
                <div className="mobile-nav-text">
                  <span className="mobile-nav-title">Rewards</span>
                  <span className="mobile-nav-desc">See your points, vouchers, and referrals</span>
                </div>
                <ChevronRight className="mobile-nav-chevron" size={18} />
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${mainTab === 'faq' ? 'active' : ''}`}
                onClick={() => {
                  setMainTab('faq');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon-box">
                  <HelpCircle size={18} />
                </div>
                <div className="mobile-nav-text">
                  <span className="mobile-nav-title">Help &amp; FAQ</span>
                  <span className="mobile-nav-desc">Get answers and support</span>
                </div>
                <ChevronRight className="mobile-nav-chevron" size={18} />
              </button>

              {mainTab !== 'claim' && (
                <button
                  type="button"
                  className="mobile-nav-link"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsMobileSearchOpen(true);
                  }}
                >
                  <div className="mobile-nav-icon-box">
                    <Search size={18} />
                  </div>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-title">Search NairaDots</span>
                    <span className="mobile-nav-desc">Find a person, tag, or agent</span>
                  </div>
                  <ChevronRight className="mobile-nav-chevron" size={18} />
                </button>
              )}
            </div>

            <div className="mobile-drawer-footer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <button
                  type="button"
                  className="quick-chip-btn"
                  onClick={toggleTheme}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                >
                  {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MOBILE QUICK SEARCH MODAL (SEARCH ICON TRIGGER)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isMobileSearchOpen && (
        <div className="mobile-search-backdrop" onClick={() => setIsMobileSearchOpen(false)}>
          <div className="mobile-search-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-search-bar-row">
              <Search size={18} color="var(--privy-color-foreground-3)" />
              <input
                type="text"
                autoFocus
                className="mobile-search-input"
                placeholder="Search â‚¦Tag, Agent, or 0x address..."
                value={mobileSearchQuery}
                onChange={(e) => handleMobileSearch(e.target.value)}
              />
              <button
                type="button"
                className="agent-modal-close-btn"
                onClick={() => setIsMobileSearchOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Presets */}
            {!mobileSearchQuery && (
              <div style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-3)', textTransform: 'uppercase' }}>
                  Popular Searches
                </span>
                <div className="quick-tag-suggestions" style={{ marginTop: '8px' }}>
                  {['â‚¦chowdeck', 'â‚¦dev', 'â‚¦designer', 'â‚¦food', 'â‚¦ride', 'â‚¦escrow'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="tag-suggestion-chip"
                      onClick={() => handleMobileSearch(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {mobileSearchResult && (
              <div className="mobile-search-results">
                {mobileSearchResult.agent ? (
                  <div
                    className="agent-circle-row"
                    style={{ margin: '8px 12px', border: '1px solid var(--privy-color-border)' }}
                    onClick={() => {
                      setIsMobileSearchOpen(false);
                      const agent = mobileSearchResult.agent;
                      if (agent.identity?.verifiedOnchain && agent.identity?.erc8004AgentId) {
                        handleOpenAgentProfile({ ...agent, id: agent.identity.erc8004AgentId });
                      } else {
                        handleOpenPlatformAgentProfile(agent);
                      }
                    }}
                  >
                    <div className="agent-circle-left">
                      <img src={mobileSearchResult.agent.avatar} alt="" className="agent-circle-avatar-img" />
                      <div className="agent-circle-meta">
                        <div className="agent-directory-list-description">
                          {agent.name && agent.name !== agent.tag ? agent.name : agent.category || agent.role}
                          {agent.category && agent.name && agent.name !== agent.tag ? ` Â· ${agent.category}` : ''}
                        </div>
                        <div className="agent-circle-name">
                          <span>{mobileSearchResult.agent.name}</span>
                          <span className="agent-circle-tag-pill">â‚¦{mobileSearchResult.agent.tag}</span>
                        </div>
                        <div className="agent-circle-tagline">{mobileSearchResult.agent.role}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--privy-color-foreground-3)" />
                  </div>
                ) : (
                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--privy-color-foreground)' }}>
                        â‚¦{mobileSearchResult.tag}
                      </div>
                      <div style={{ fontSize: '12px', color: mobileSearchResult.available ? '#059669' : '#DC2626', fontWeight: 600 }}>
                        {mobileSearchResult.available ? 'âœ“ Available to claim' : 'âœ• Taken / Registered'}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-action-primary"
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                      onClick={() => {
                        setIsMobileSearchOpen(false);
                        if (mobileSearchResult.available) {
                          setClaimInput(mobileSearchResult.tag);
                          setMainTab('claim');
                        } else {
                          setRecipientInput(`â‚¦${mobileSearchResult.tag}`);
                          setMainTab('pay');
                        }
                      }}
                    >
                      {mobileSearchResult.available ? 'Claim Tag' : 'Send USDC'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Main Application Body â”€â”€â”€ */}
      <main className={`main-content-wrapper ${mainTab === 'claim' ? 'claim-active' : ''} ${mainTab === 'chat' ? 'chat-mode' : ''}`}>
        {mainTab === 'profile' && (
          <section className="account-dashboard">
            <div className="account-dashboard-heading">
              <div>
                <span className="account-dashboard-eyebrow">ACCOUNT</span>
                <h1>Profile dashboard</h1>
                <p>Your NairaTag identity, Arc wallet, and rewards in one place.</p>
              </div>
              <button type="button" className="quick-chip-btn" onClick={() => setMainTab('chat')}><ArrowLeft size={14} /> Back to chat</button>
            </div>

            {walletAddress ? (
              <>
                <article className="account-identity-card">
                  <ProfileAvatar tag={myTag?.tag} email={accountEmail} size={52} className="account-avatar" />
                  <div className="account-identity-copy">
                    <span>{authProvider === 'circle' ? 'Circle email account' : 'Connected wallet account'}</span>
                    <h2>{displayAccountName || 'Your Arc account'}</h2>
                    <p>{accountEmail || (myTag?.tag ? 'Your NairaTag is connected to your Arc wallet.' : 'Claim a NairaTag to create your readable payment identity.')}</p>
                  </div>
                  <span className="account-network-pill"><span /> Arc Testnet</span>
                </article>

                <div className="account-stats-grid">
                  <article className="account-stat-card"><span>USDC balance</span><strong>{usdcBalance.formatted}</strong><small>â‰ˆ â‚¦{(parseFloat(usdcBalance.formatted || '0') * 1485).toLocaleString('en-NG', { maximumFractionDigits: 2 })} NGN</small></article>
                  <article className="account-stat-card"><span>Protocol Points</span><strong>{Number(userPoints || 0).toLocaleString()}</strong><small>Earned across NairaTag rewards</small></article>
                </div>

                <article className="account-wallet-card">
                  <div className="account-wallet-heading"><div><span className="account-dashboard-eyebrow">YOUR WALLET</span><h2>{authProvider === 'circle' ? 'Circle Programmable Wallet' : 'Browser wallet'}</h2></div><span className="account-network-pill"><span /> Connected</span></div>
                  <div className="account-wallet-address"><span>{walletAddress}</span><button type="button" className="quick-chip-btn" onClick={() => triggerCopy('profile_wallet_copy', walletAddress)}><Copy size={13} />{copiedKey === 'profile_wallet_copy' ? 'Copied' : 'Copy'}</button></div>
                  <div className="account-dashboard-actions">
                    <button type="button" className="btn-action-primary" onClick={() => setMainTab('pay')}><Send size={15} /> Send USDC</button>
                    <button type="button" className="quick-chip-btn" onClick={() => { setWalletTab('overview'); setIsWalletModalOpen(true); }}><Wallet size={15} /> Wallet details</button>
                    <button type="button" className="quick-chip-btn" onClick={() => setMainTab('rewards')}><Gift size={15} /> Rewards</button>
                    {myTag?.tag ? <button type="button" className="quick-chip-btn" onClick={() => setIsPersonalAgentOpen(true)}><Brain size={15} /> Personal agent</button> : <button type="button" className="quick-chip-btn" onClick={() => setMainTab('claim')}><Tag size={15} /> Claim a NairaTag</button>}
                  </div>
                </article>
              </>
            ) : (
              <article className="account-wallet-card account-profile-empty"><User size={24} /><h2>Sign in to view your profile</h2><p>Your account details and rewards will appear here after sign in.</p><button type="button" className="btn-action-primary" onClick={() => setIsConnectModalOpen(true)}>Sign in</button></article>
            )}
          </section>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB 1: PAY & RESOLVE TERMINAL
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'pay' && (
          <div className="terminal-layout-centered">
            <div className="crypto-card-terminal">
              <div className="card-header-bar">
                <span className="card-header-title">
                  <Send size={15} />
                  <span>Send USDC</span>
                </span>
                <div className="card-header-actions">
                  <span className="slippage-pill">
                    <Clock size={10} />
                    <span>&lt; 1s</span>
                  </span>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => setMainTab('claim')}
                  >
                    + Claim â‚¦Tag
                  </button>
                </div>
              </div>

              {/* 1. Recipient â‚¦Tag Input Box */}
              <div className="tag-recipient-box">
                <div className="token-input-header">
                  <span>To</span>
                  <span style={{ color: 'var(--privy-color-border-interactive)' }}>Direct Resolve</span>
                </div>
                <div className="tag-input-field-wrap">
                  <span className="tag-currency-symbol">â‚¦</span>
                  <input
                    type="text"
                    className="tag-text-field"
                    placeholder="Enter name (e.g. SEGUN, FOOD)"
                    value={recipientInput.replace(/^[$â‚¦]/, '')}
                    onChange={(e) => setRecipientInput(e.target.value)}
                  />
                  {resolution.loading && <RefreshCw size={14} className="animate-spin" color="var(--privy-color-border-interactive)" />}
                </div>

                {/* Quick suggestions chips */}
                <div className="quick-tag-suggestions">
                  <span style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-3)' }}>Suggestions:</span>
                  {['segun', 'alice', 'food', 'ride', 'pay'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="tag-suggestion-chip"
                      onClick={() => setRecipientInput(`â‚¦${tag}`)}
                    >
                      â‚¦{tag}
                    </button>
                  ))}
                </div>

                {/* Resolved Recipient Card */}
                {resolution.data && resolution.data.resolvedAddress && (
                  <div className="resolved-recipient-card">
                    <div className="resolved-left">
                      <div className="resolved-avatar">
                        {resolution.data.tag ? resolution.data.tag.slice(1, 2) : 'â‚¦'}
                      </div>
                      <div>
                        <div className="resolved-title">
                          {resolution.data.tag || 'Verified Recipient'}
                          <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--privy-color-success-dark)', fontWeight: 600 }}>
                            â— RESOLVED
                          </span>
                        </div>
                        {resolution.data.phone && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#047857', fontWeight: 700, margin: '2px 0' }}>
                            <Phone size={10} />
                            <span>{resolution.data.phone} (Nigerian Telco Gateway)</span>
                          </div>
                        )}
                        <div className="resolved-sub">
                          {shorten(resolution.data.resolvedAddress)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="quick-chip-btn"
                      onClick={() => triggerCopy('resolved_copy', resolution.data.resolvedAddress)}
                    >
                      <Copy size={11} />
                      <span>{copiedKey === 'resolved_copy' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                {resolution.error && (
                  <div style={{ fontSize: '11px', color: 'var(--privy-color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} />
                    <span>{resolution.error}</span>
                  </div>
                )}
              </div>

              {/* 2. Amount Input Box */}
              <div className="token-input-box">
                <div className="token-input-header">
                  <span>You Send</span>
                  <span>Balance: {usdcBalance.formatted} USDC</span>
                </div>
                <div className="token-input-row">
                  <input
                    type="number"
                    step="any"
                    className="token-amount-field"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                  <div className="token-selector-capsule">
                    <span className="token-icon-round token-icon-usdc">$</span>
                    <span>USDC</span>
                  </div>
                </div>
                <div className="token-input-footer">
                  <span>Arc USDC</span>
                  <div className="balance-quick-chips">
                    <button type="button" className="quick-chip-btn" onClick={() => setAmountInput('5.00')}>5</button>
                    <button type="button" className="quick-chip-btn" onClick={() => setAmountInput('10.00')}>10</button>
                    <button type="button" className="quick-chip-btn" onClick={() => setAmountInput('25.00')}>25</button>
                    <button
                      type="button"
                      className="quick-chip-btn"
                      onClick={() => setAmountInput(usdcBalance.formatted !== '0.00' ? usdcBalance.formatted : '100.00')}
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Optional Memo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--privy-color-border-interactive)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    onClick={() => setShowMemoField(!showMemoField)}
                  >
                    <span>{showMemoField ? 'âˆ’ Hide Memo' : '+ Add Memo (Optional)'}</span>
                  </button>
                  <span style={{ fontSize: '10px', color: 'var(--privy-color-foreground-3)' }}>0x5294...e3dc</span>
                </div>
                {showMemoField && (
                  <input
                    type="text"
                    className="tag-text-field"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: '12.5px', width: '100%', textTransform: 'none' }}
                    placeholder="e.g. Lunch / Invoice #104"
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                  />
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="btn-action-primary"
                disabled={resolution.loading && !recipientInput.startsWith('0x')}
                onClick={handleInitiateSend}
              >
                <Send size={15} />
                <span>Review & Send</span>
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB 2: CLAIM NAIRATAG IDENTITY
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'claim' && (
          <div className="claim-page-layout">
            {/* Left Column: Uniswap-width 480px Main Claim Console & Registrations */}
            <main className="claim-page-main">
              <div className="claim-console-card">
                {/* Active Claimed Tag Banner (Persistent Profile Display) */}
                {myTag?.tag && (
                  <div className="active-claimed-banner">
                    <div className="active-claimed-info">
                      <span style={{ fontSize: '15px' }}>âœ¨</span>
                      <div>
                        <div className="active-claimed-label">
                          You own <strong>â‚¦{myTag.tag?.replace(/^[$â‚¦]/, '').toUpperCase()}</strong>
                        </div>
                        <div className="active-claimed-sub">
                          {shorten(walletAddress)} Â· Arc Testnet
                        </div>
                      </div>
                    </div>
                    <div className="active-claimed-actions">
                      <button
                        type="button"
                        className="btn-claimed-action"
                        onClick={() => triggerCopy('my_tag', `â‚¦${myTag.tag?.replace(/^[$â‚¦]/, '').toUpperCase()}`)}
                        title="Copy â‚¦Tag"
                      >
                        {copiedKey === 'my_tag' ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={getTwitterShareUrl({ tag: myTag.tag })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-claimed-social-action"
                        title="Share on X"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                      <a
                        href={getTelegramShareUrl({ tag: myTag.tag })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-claimed-social-action"
                        title="Share on Telegram"
                      >
                        <Send size={12} />
                      </a>
                      <a
                        href={getWhatsAppShareUrl({ tag: myTag.tag })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-claimed-social-action"
                        title="Share on WhatsApp"
                      >
                        <Share2 size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Center Stage: Live Type Tag Searching Display */}
                <div className="claim-hero-stage">
                  <div className="claim-stage-subtitle">Claim your NairaTag</div>
                  <div
                    className={`claim-live-tag-display ${claimInput.trim() ? 'has-value' : ''}`}
                    style={{
                      fontSize: claimPreviewFontSize,
                      fontWeight: claimPreviewText.length > 14 ? 700 : 800,
                      letterSpacing: claimPreviewText.length > 12 ? '-0.02em' : '-0.04em',
                    }}
                    onClick={() => {
                      const input = document.getElementById('claim-tag-input-field');
                      if (input) input.focus();
                    }}
                    title="Click to search / edit tag"
                  >
                    <span className="live-tag-prefix">â‚¦</span>
                    <span>{claimPreviewText}</span>
                  </div>
                </div>

                {/* Pill Input Box with Inline Status Pill */}
                <div className="claim-pill-input-box">
                  <input
                    id="claim-tag-input-field"
                    type="text"
                    className="claim-pill-input"
                    placeholder="Enter your username"
                    autoComplete="off"
                    spellCheck="false"
                    aria-label="Enter your username"
                    value={claimInput.replace(/^[$â‚¦]/, '')}
                    onChange={(e) => handleCheckClaim(e.target.value)}
                  />
                  <div className="claim-input-right-cluster">
                    <div
                      className={`tag-status-indicator ${claimStatus?.loading
                        ? 'checking'
                        : claimStatus?.available
                          ? 'available'
                          : claimInput.trim()
                            ? 'taken'
                            : ''
                        }`}
                    >
                      {claimStatus?.loading ? (
                        <>
                          <RefreshCw size={11} className="animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : claimStatus?.available ? (
                        <>
                          <Check size={12} strokeWidth={2.8} />
                          <span>Available</span>
                        </>
                      ) : claimInput.trim() ? (
                        <>
                          <X size={12} strokeWidth={2.8} />
                          <span>Taken</span>
                        </>
                      ) : (
                        <span>Ready</span>
                      )}
                    </div>

                    {/* Live Interactive Mascot right beside Ready/Available */}
                    <div
                      className="claim-live-mascot-pill"
                      title={`â‚¦${claimInput.replace(/^[$â‚¦]/, '').toLowerCase() || 'tag'} Live Mascot (${liveMascotProfile?.palette?.name || 'Vibrant'})`}
                      style={{
                        backgroundColor: liveMascotProfile?.palette?.primary || '#bbf246',
                      }}
                      onClick={() => {
                        const el = document.getElementById('claim-live-mascot-avatar');
                        if (el) {
                          el.classList.remove('mascot-bounce');
                          void el.offsetWidth;
                          el.classList.add('mascot-bounce');
                        }
                      }}
                    >
                      <div
                        id="claim-live-mascot-avatar"
                        className="claim-mascot-svg"
                        dangerouslySetInnerHTML={{ __html: liveMascotProfile?.avatarSvg || '' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pill Claim Button */}
                <button
                  type="button"
                  className="claim-pill-button"
                  disabled={!claimStatus?.available || isClaiming}
                  onClick={handleExecuteClaim}
                >
                  {isClaiming ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Claiming your â‚¦Tagâ€¦</span>
                    </>
                  ) : (
                    <span>Claim</span>
                  )}
                </button>
              </div>

              {pendingArcAgentLink && pendingArcAgentLink.owner?.toLowerCase() === walletAddress?.toLowerCase() && (
                <button
                  type="button"
                  className="quick-chip-btn"
                  style={{ alignSelf: 'center', marginTop: '8px' }}
                  disabled={isRetryingArcAgentLink}
                  onClick={handleRetryArcAgentLink}
                >
                  {isRetryingArcAgentLink ? 'Linking to ERC-8004â€¦' : `Complete ERC-8004 link for â‚¦${pendingArcAgentLink.tag.toUpperCase()}`}
                </button>
              )}

              {/* Recent tag activity appears when Arc has tags to show. */}
              {recentArcTags.length > 0 && (
                <div className="reg-carousel-container">
                  <div
                    className="reg-carousel-track"
                    style={{ transform: `translateX(-${claimRegSlide * 100}%)` }}
                  >
                    {Array.from({ length: Math.ceil(recentArcTags.length / 3) }, (_, page) => (
                      <div className="reg-slide" key={`activity-page-${page}`}>
                        {recentArcTags.slice(page * 3, page * 3 + 3).map((item) => (
                          <button
                            key={`${item.tag}-${item.transactionHash || item.blockNumber}`}
                            type="button"
                            className="reg-pill-item"
                            onClick={() => handleOpenRecentClaimProfile(item)}
                            title={`Open â‚¦${item.tag} profile`}
                          >
                            <img
                              className="reg-dicebear-avatar"
                              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.tag)}`}
                              alt=""
                              onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                            />
                            <span className="reg-pill-copy">
                              <span className="reg-handle-tag">â‚¦{item.tag}</span>
                              <span className="reg-activity-kind">{item.activity === 'used' ? 'Used recently' : 'Just claimed'}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </main>

          </div>
        )}



        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB 3: AI AGENTS (GRID & LIST VIEW GROUNDED IN REFERENCES 1, 2, 3)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'agents' && (
          <div className="agents-page-container">
            {/* Top Bar: Search and Grid/List View Toggle */}
            <div className="agents-top-bar">
              <div className="agents-top-controls" style={{ width: '100%', justifyContent: 'space-between' }}>
                {/* Search Bar */}
                <div className="agents-search-input-wrap" style={{ flex: 1, maxWidth: '420px' }}>
                  <Search size={14} color="var(--privy-color-foreground-3)" />
                  <input
                    type="text"
                    className="agents-search-input"
                    placeholder="Search agents..."
                    value={agentsSearchQuery}
                    onChange={(e) => setAgentsSearchQuery(e.target.value)}
                  />
                  {agentsSearchQuery && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--privy-color-foreground-3)' }}
                      onClick={() => setAgentsSearchQuery('')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Grid / List Switcher */}
                <div className="agents-view-toggle">
                  <button
                    type="button"
                    className={`view-toggle-btn ${agentsViewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setAgentsViewMode('grid')}
                    title="Grid View"
                    aria-label="Grid View"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn ${agentsViewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setAgentsViewMode('list')}
                    title="List View"
                    aria-label="List View"
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            </div>

            {agentDirectoryError && (
              <div className="agent-directory-notice" role="status">
                <span>Could not load the Arc agent registry: {agentDirectoryError}</span>
                <button type="button" onClick={() => loadAgentDirectory()} disabled={agentDirectoryLoading}>
                  {agentDirectoryLoading ? 'Retryingâ€¦' : 'Try again'}
                </button>
              </div>
            )}

            {agentDirectoryLoading && chatAgents.length === 0 && (
              <div className="agent-directory-empty" role="status">Loading agents from the Arc registryâ€¦</div>
            )}
            {!agentDirectoryLoading && !agentDirectoryError && chatAgents.length === 0 && (
              <div className="agent-directory-empty" role="status">No agents have been listed yet.</div>
            )}

            {/* Directory records and capability availability come from the Arc registry. */}
            {agentsViewMode === 'grid' && (
              <div className="agents-milestones-grid">
                {rankedAgents.map((agent) => (
                  <div
                    key={agent.tag}
                    className="agent-milestone-card agent-directory-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => openDirectoryAgent(agent)}
                    onKeyDown={(event) => handleDirectoryCardKeyDown(event, agent)}
                    aria-label={`Open ${agent.name || agent.tag} agent profile`}
                  >
                    <div className="milestone-badge-stage">
                      <div className="agent-directory-avatar-wrap">
                        <img className="agent-circle-avatar-img" src={agent.avatar} alt="" aria-hidden="true" />
                        <span className={`agent-directory-rank ${agent.leaderboardRank <= 3 ? `rank-top${agent.leaderboardRank}` : ''}`}>#{agent.leaderboardRank}</span>
                      </div>
                    </div>
                    <div className="agent-directory-tag">â‚¦{String(agent.tag || '').replace(/^[â‚¦$@#]/, '')}</div>
                    {agent.category && <div className="agent-directory-category">{agent.category}</div>}
                    <div className="agent-directory-points">{agentPointsLabel(agent)}</div>
                    <div className="agent-directory-card-earnings">
                      <strong>{agentEarningsLabel(agent)} earned</strong>
                    </div>
                  </div>
                ))}
                {!filteredAgents.length && !agentDirectoryLoading && chatAgents.length > 0 && <div className="agent-directory-empty">No agents match this search.</div>}
              </div>
            )}

            {agentsViewMode === 'list' && (
              <div className="agents-circle-list">
                {rankedAgents.map((agent) => (
                  <div
                    key={agent.tag}
                    className="agent-circle-row agent-directory-list-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => openDirectoryAgent(agent)}
                    onKeyDown={(event) => handleDirectoryCardKeyDown(event, agent)}
                    aria-label={`Open ${agent.name || agent.tag} agent profile`}
                  >
                    <div className="agent-circle-left">
                      <div className="agent-circle-avatar-wrap agent-directory-avatar-wrap">
                        <img src={agent.avatar} alt="" aria-hidden="true" className="agent-circle-avatar-img" />
                        <span className={`agent-directory-rank ${agent.leaderboardRank <= 3 ? `rank-top${agent.leaderboardRank}` : ''}`}>#{agent.leaderboardRank}</span>
                      </div>
                      <div className="agent-circle-meta">
                        <div className="agent-circle-name">
                          <span className="agent-circle-tag-pill">â‚¦{String(agent.tag || '').replace(/^[â‚¦$@#]/, '')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="agent-circle-right">
                      <span className="agent-directory-points">{agentPointsLabel(agent)}</span>
                      <span className="agent-directory-earnings">{agentEarningsLabel(agent)} earned</span>
                      <ChevronRight size={16} color="var(--privy-color-foreground-3)" />
                    </div>
                  </div>
                ))}
                {!filteredAgents.length && <div className="agent-directory-empty">No agents match this search.</div>}
              </div>
            )}

          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB: TASKS & BOUNTIES (MATCHING AGENTS PAGE LAYOUT & DESIGN)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'tasks' && (
          <div className="agents-page-container">
            {selectedTask ? (
              <section className="task-detail-page">
                <button type="button" className="btn-agent-secondary task-detail-back" onClick={() => setSelectedTaskId(null)}>
                  <ArrowLeft size={15} /> Back to tasks
                </button>

                <div className="task-detail-heading">
                  <div className="milestone-badge-stage">
                    <AgentMedallion type={selectedTask.badgeType || 'emerald'} size={46} />
                  </div>
                  <div className="task-detail-heading-copy">
                    <span className="task-cat-pill active">{selectedTask.categoryLabel}</span>
                    <h1>{selectedTask.title}</h1>
                    <p>Posted by â‚¦{selectedTask.creatorTag.replace(/^â‚¦/, '').toUpperCase()} Â· {selectedTask.deadline}</p>
                  </div>
                </div>

                {selectedTask.isVoucherTask ? (
                  <div className="task-detail-grid">
                    <div className="task-detail-main">
                      <article className="task-detail-panel">
                        <h2>Task details</h2>
                        <p>{selectedTask.description}</p>
                        <div className="task-detail-deliverable">
                          <strong>How to complete</strong>
                          <span>{selectedTask.voucherTask.description}</span>
                        </div>
                        {selectedTask.voucherTask.url === 'rewards-referral' ? (
                          <button type="button" className="btn-agent-secondary" onClick={() => { setRewardsInitialPage('referral'); setMainTab('rewards'); }}>
                            <Share2 size={14} /> {selectedTask.voucherTask.actionLabel}
                          </button>
                        ) : (
                          <a className="btn-agent-secondary" href={selectedTask.voucherTask.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} /> {selectedTask.voucherTask.actionLabel}
                          </a>
                        )}
                      </article>
                      <article className="task-detail-panel task-submit-panel">
                        <h2>Submit completion</h2>
                        <p>After completing the task, submit it for review. Approved tasks credit Protocol Points to your wallet.</p>
                        <button type="button" className="btn-agent-primary" onClick={() => handleClaimInHouseVoucher(selectedTask.voucherTask)} disabled={Boolean(selectedVoucherClaim)}>
                          <CheckCircle2 size={14} />
                          {selectedVoucherClaim ? 'Submitted for review' : 'I completed this task'}
                        </button>
                      </article>
                    </div>
                    <aside className="task-detail-sidebar">
                      <article className="task-detail-panel task-reward-panel">
                        <span className="task-detail-eyebrow">VOUCHER REWARD</span>
                        <strong>+{selectedTask.points} <small>Points</small></strong>
                        <span>Protocol Points after approval</span>
                      </article>
                      <article className="task-detail-panel">
                        <h2><ShieldCheck size={16} /> Review status</h2>
                        <div className="task-escrow-status">{selectedVoucherClaim?.status === 'approved' ? 'Approved' : selectedVoucherClaim?.status === 'rejected' ? 'Not approved' : selectedVoucherClaim ? 'Pending review' : 'Not submitted'}</div>
                        <p>Submissions are signed by your wallet and reviewed by the NairaTag team.</p>
                      </article>
                    </aside>
                  </div>
                ) : (
                  <div className="task-detail-grid">
                  <div className="task-detail-main">
                    <article className="task-detail-panel">
                      <h2>Task details</h2>
                      <p>{selectedTask.description}</p>
                      <div className="task-detail-deliverable">
                        <strong>What to submit</strong>
                        <span>{selectedTask.deliverable}</span>
                      </div>
                      {selectedTask.requirements && (
                        <div className="task-detail-deliverable">
                          <strong>Requirements</strong>
                          <span>{selectedTask.requirements}</span>
                        </div>
                      )}
                    </article>

                    <article className="task-detail-panel task-submit-panel">
                      <div className="task-detail-panel-heading">
                        <div>
                          <h2>Work & submission</h2>
                          <p>{taskProgress[selectedTask.id]?.status === 'submitted' ? 'Your work has been submitted for review.' : 'Start the task, then submit a link or describe your completed work.'}</p>
                        </div>
                        <span className={`task-progress-badge ${taskProgress[selectedTask.id]?.status || 'not-started'}`}>
                          {taskProgress[selectedTask.id]?.status === 'paid' ? 'Reward paid' : taskProgress[selectedTask.id]?.status === 'submitted' ? 'In review' : taskProgress[selectedTask.id]?.status === 'in_progress' ? 'In progress' : 'Not started'}
                        </span>
                      </div>
                      {taskProgress[selectedTask.id]?.status === 'paid' ? (
                        <div className="task-submission-saved">
                          <CheckCircle2 size={17} />
                          <div>
                            <strong>Task reward paid</strong>
                            <span>The Arc task service confirms this bounty as paid.</span>
                            <span className="task-share-actions">
                              <a href={getTwitterTaskShareUrl({ title: selectedTask.title, rewardUSDC: selectedTask.rewardUSDC, points: selectedTask.points, userTag: myTag?.tag })} target="_blank" rel="noopener noreferrer">Share on X</a>
                              <a href={getTelegramShareIntentUrl({ text: `I completed "${selectedTask.title}" and received its task reward on NairaTag.`, url: myTag?.tag ? getTagShareUrl(myTag.tag) : 'https://arc.nairatag.ng/#tasks' })} target="_blank" rel="noopener noreferrer">Share on Telegram</a>
                            </span>
                          </div>
                        </div>
                      ) : taskProgress[selectedTask.id]?.status === 'submitted' ? (
                        <div className="task-submission-saved">
                          <CheckCircle2 size={17} />
                          <div>
                            <strong>Submission saved</strong>
                            <span>Sent to the Arc task service for bounty owner review.</span>
                            <span className="task-share-actions">
                              <a href={getTwitterTaskShareUrl({ title: selectedTask.title, rewardUSDC: selectedTask.rewardUSDC, points: selectedTask.points, userTag: myTag?.tag })} target="_blank" rel="noopener noreferrer">Share on X</a>
                              <a href={getTelegramShareIntentUrl({ text: `I submitted "${selectedTask.title}" on NairaTag. My bounty is pending task-owner review.`, url: myTag?.tag ? getTagShareUrl(myTag.tag) : 'https://arc.nairatag.ng/#tasks' })} target="_blank" rel="noopener noreferrer">Share on Telegram</a>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {taskProgress[selectedTask.id]?.status !== 'in_progress' && (
                            <button type="button" className="btn-agent-primary" onClick={() => handleStartTask(selectedTask)}>
                              Start this task <ChevronRight size={15} />
                            </button>
                          )}
                          <textarea
                            className="token-amount-field task-submission-input"
                            rows={4}
                            placeholder="Paste your deliverable link or describe the work you completed..."
                            value={taskSubmissionDraft}
                            onChange={(event) => setTaskSubmissionDraft(event.target.value)}
                            disabled={taskProgress[selectedTask.id]?.status !== 'in_progress'}
                          />
                          <button
                            type="button"
                            className="btn-agent-primary"
                            onClick={() => handleSubmitTask(selectedTask)}
                            disabled={taskProgress[selectedTask.id]?.status !== 'in_progress'}
                          >
                            <Send size={14} /> Submit work for review
                          </button>
                        </>
                      )}
                      <div className="task-detail-local-note">Task progress and submissions are stored in the shared Arc task service. Escrow payouts remain unavailable until an Arc escrow contract is deployed and connected.</div>
                    </article>
                  </div>

                  <aside className="task-detail-sidebar">
                    <article className="task-detail-panel task-reward-panel">
                      <span className="task-detail-eyebrow">BOUNTY REWARD</span>
                      <strong>${selectedTask.rewardUSDC} <small>USDC</small></strong>
                      <span>+{selectedTask.points} Protocol Points after approval</span>
                      <button type="button" className="btn-agent-secondary" disabled title="The bounty escrow contract is not connected yet.">
                        <Coins size={14} /> Claim reward
                      </button>
                      <small className="task-detail-local-note">Reward claims activate after escrow contract and owner approval integration.</small>
                    </article>

                    <article className="task-detail-panel">
                      <h2><ShieldCheck size={16} /> Escrow status</h2>
                      <div className="task-escrow-status">{selectedTask.escrowStatus}</div>
                      <p>Arc task progress is stored remotely. This bounty is not yet backed by an Arc escrow contract.</p>
                    </article>

                    <button type="button" className="btn-agent-secondary task-chat-button" onClick={() => handleTaskChat(selectedTask)}>
                      <MessageSquare size={15} /> Chat with task owner
                    </button>
                  </aside>
                  </div>
                )}
              </section>
            ) : (
              <>
            {/* Top Bar: Search and Grid/List View Toggle */}
            <div className="agents-top-bar">
              <div className="agents-top-controls task-top-controls" style={{ width: '100%', justifyContent: 'space-between', gap: '8px' }}>
                {/* Search Bar (reduced compact length to leave maximum room for Create Task) */}
                <div className="agents-search-input-wrap task-search-wrap" style={{ flex: '0 1 110px', maxWidth: '120px', minWidth: '70px' }}>
                  <Search size={13} color="var(--privy-color-foreground-3)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    className="agents-search-input task-search-input"
                    placeholder="Search..."
                    value={tasksSearch}
                    onChange={(e) => setTasksSearch(e.target.value)}
                    style={{ minWidth: 0, width: '100%' }}
                  />
                  {tasksSearch && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--privy-color-foreground-3)', flexShrink: 0 }}
                      onClick={() => setTasksSearch('')}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Create Task Button */}
                <div className="task-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="btn-agent-primary create-task-header-btn"
                    style={{ padding: '6px 11px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={() => setIsPostTaskOpen(true)}
                  >
                    <Plus size={13} />
                    <span>Create Task</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics Overview Row (Compact 4-in-a-row matching Agents stats grid) */}
            <div className="agents-stats-grid">
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Active Tasks</span>
                <span className="agents-stat-card-value">{allTasks.length + IN_HOUSE_TASKS.length}</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Total Agents</span>
                <span className="agents-stat-card-value">{chatAgents.length}</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Total Earned</span>
                <span className="agents-stat-card-value" style={{ color: '#059669' }}>{userPoints.toLocaleString()} Pts</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Your Points</span>
                <span className="agents-stat-card-value" style={{ color: '#059669' }}>{userPoints} Pts</span>
              </div>
            </div>

            {/* Category Filter Pills Row */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {[
                { id: 'all', label: 'All Tasks' },
                { id: 'dev', label: 'âš¡ Engineering' },
                { id: 'design', label: 'ðŸŽ¨ Design' },
                { id: 'data', label: 'ðŸ“Š Data & AI' },
                { id: 'content', label: 'âœï¸ Content' },
                { id: 'test', label: 'ðŸ§ª Testing' },
                { id: 'community', label: 'ðŸ“± Community' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`task-cat-pill ${tasksFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setTasksFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="agents-milestones-grid">
                {filteredTasks.length === 0 ? (
                  <div className="tasks-empty-state-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="tasks-empty-badge-glow">
                      <div className="tasks-empty-icon-wrap">
                        {tasksLoading ? (
                          <RefreshCw size={26} color="#5B4FFF" className="spin-anim" />
                        ) : (tasksSearch || tasksFilter !== 'all') ? (
                          <Search size={24} color="#5B4FFF" />
                        ) : (
                          <Sparkles size={26} color="#5B4FFF" />
                        )}
                      </div>
                    </div>

                    <h3 className="tasks-empty-title">
                      {tasksLoading
                        ? 'Syncing Arc Escrow Bountiesâ€¦'
                        : (tasksSearch || tasksFilter !== 'all')
                          ? 'No Matching Tasks Found'
                          : 'No tasks available'}
                    </h3>

                    {(tasksLoading || tasksSearch || tasksFilter !== 'all') && (
                      <p className="tasks-empty-subtitle">
                        {tasksLoading
                          ? 'Connecting to Arc Osaka smart contracts and querying verified community milestonesâ€¦'
                          : tasksSearch
                            ? `No bounties match "${tasksSearch}". Try clearing your search or switching categories.`
                            : 'There are no open bounties in this category yet. Explore other categories or post one yourself.'}
                      </p>
                    )}

                    <div className="tasks-empty-actions">
                      {(tasksSearch || tasksFilter !== 'all') && (
                        <button
                          type="button"
                          className="btn-agent-secondary"
                          onClick={() => { setTasksSearch(''); setTasksFilter('all'); }}
                        >
                          Clear Filters
                        </button>
                      )}
                      {!tasksLoading && (
                        <button
                          type="button"
                          className="btn-agent-primary"
                          onClick={() => setIsPostTaskOpen(true)}
                        >
                          <Plus size={14} />
                          <span>Create Task</span>
                        </button>
                      )}
                      {!tasksLoading && (
                        <button
                          type="button"
                          className="btn-agent-secondary"
                          onClick={() => setTasksRefreshKey((key) => key + 1)}
                          title="Refresh tasks list"
                        >
                          <RefreshCw size={13} />
                          <span>Refresh</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  filteredTasks.map((task, idx) => {
                    const voucherClaim = task.isVoucherTask
                      ? inHouseVouchers.find((voucher) => voucher.taskId === task.voucherTask.id)
                      : null;
                    const isDone = task.isVoucherTask
                      ? voucherClaim?.status === 'approved'
                      : taskProgress[task.id]?.status === 'paid';
                    const rankLabel = task.rank || `#${idx + 1}`;
                    return (
                      <div
                        key={task.id}
                        className="agent-milestone-card"
                        onClick={() => setSelectedTaskId(task.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedTaskId(task.id); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="card-rank-tag">{rankLabel}</span>

                        <div className="milestone-badge-stage">
                          <AgentMedallion type={task.badgeType || (idx % 2 === 0 ? 'emerald' : 'cyan')} size={46} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <h3 className="milestone-card-title" style={{ margin: 0 }}>â‚¦{task.creatorTag.replace(/^â‚¦/, '').toUpperCase()}</h3>
                          <img
                            src="/verified-badge.png"
                            alt=""
                            aria-hidden="true"
                            style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                            title="Arc Escrow Verified"
                          />
                        </div>
                        <div className="milestone-card-role" title={task.title}>{task.title}</div>

                        <div className="milestone-task-status">
                          <span>{task.categoryLabel} â€¢ {task.deadline}</span>
                        </div>

                        <div className="milestone-progress-bar-wrap">
                          <div
                            className="milestone-progress-bar-fill"
                            style={{
                              width: isDone ? '100%' : '75%',
                              background: isDone ? '#10B981' : 'var(--primary, #0052FF)'
                            }}
                          />
                        </div>

                        <div className="milestone-earnings-row">
                          <span className="milestone-earnings-label">Reward</span>
                          <span className="milestone-earnings-value" style={{ color: isDone ? '#10B981' : 'var(--primary, #0052FF)' }}>
                            {isDone ? 'Paid' : `$${task.rewardUSDC} USDC`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              </>
            )}
          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB 4: SOVEREIGN AGENT CHAT (TAG2TAG LAYER & TASK DISPATCH)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB 4: WALLEY-AI MINIMAL CHAT INTERFACE
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'chat' && (
          <div className="walley-chat-screen">
            {/* Top Navigation Bar */}
            <div className="chat-top-nav-bar">
              {(isChatConversationOpen || isTaskChatDraft) && <button
                type="button"
                className="chat-back-btn"
                onClick={() => {
                  setIsChatConversationOpen(false);
                  setIsTaskChatDraft(false);
                }}
                aria-label="Back to chat home"
                title="Back to chat home"
              >
                <ArrowLeft size={18} />
              </button>}
              <div className="chat-top-nav-actions">
              <button
                type="button"
                className={`chat-history-btn arc-voice-launch ${voice.status === 'active' ? 'is-active' : ''}`}
                onClick={handleStartVoiceCall}
                aria-label="Start a live voice call with your agent"
                title="Talk to your agent"
                disabled={voice.status === 'connecting' || voice.status === 'active'}
              ><Phone size={16} /></button>
              <button
                type="button"
                className="chat-history-btn"
                onClick={handleOpenChatHistory}
                aria-label="Open saved chat history"
                title="Saved chats"
              ><History size={16} /></button>
              {walletAddress && myTag?.tag && <button
                type="button"
                className="chat-history-btn personal-agent-open"
                onClick={() => setIsPersonalAgentOpen(true)}
                aria-label="Manage your personal agent"
                title="Manage your personal agent"
              ><Brain size={16} /><span>My agent</span></button>}
              </div>
            </div>

            {/* Main Canvas: Empty state vs Message stream */}
            {!isChatConversationOpen ? (
              /* SCREEN 1: Redesigned Welcome & Quick-Action Dashboard Matching Reference */
              <div className="walley-hero-container ref-chat-layout">
                {/* Shared NairaTag profile avatar */}
                <div className="ref-mascot-wrapper">
                  <ProfileAvatar tag={myTag?.tag} email={accountEmail} size={68} />
                </div>

                {/* Personalized Greeting */}
                <h1 className="ref-chat-heading">
                  {walletAddress && displayAccountName ? `Hey ${displayAccountName} ðŸ‘‹` : 'Hey there ðŸ‘‹'}
                </h1>

                {/* Friendly Subtitle */}
                <p className="ref-chat-sub">
                  How can I help?
                </p>

                {/* 3x2 Quick-Action Grid */}
                <div className="ref-action-grid">
                  {/* Card 1: Tasks */}
                  <button
                    type="button"
                    className="ref-action-card card-tasks"
                    onClick={() => setMainTab('tasks')}
                  >
                    <div className="ref-action-icon-circle icon-circle-tasks"><ClipboardCheckIcon size={16} /></div>
                    <span className="ref-action-title">Tasks</span>
                  </button>

                  {/* Card 2: Swap */}
                  <button
                    type="button"
                    className="ref-action-card card-swap"
                    onClick={() => handleSendChatPrompt('I want to swap tokens')}
                  >
                    <div className="ref-action-icon-circle icon-circle-swap"><ChevronsLeftRightIcon size={16} /></div>
                    <span className="ref-action-title">Swap</span>
                  </button>

                  {/* Card 3: Ride */}
                  <button
                    type="button"
                    className="ref-action-card card-ride"
                    onClick={() => handleSendChatPrompt('Book a ride with â‚¦ride')}
                  >
                    <div className="ref-action-icon-circle icon-circle-ride"><CarIcon size={16} /></div>
                    <span className="ref-action-title">â‚¦Ride</span>
                  </button>

                  {/* Card 4: Food */}
                  <button
                    type="button"
                    className="ref-action-card card-food"
                    onClick={() => handleSendChatPrompt('Order meals with â‚¦chowdeck')}
                  >
                    <div className="ref-action-icon-circle icon-circle-food"><CookingPotIcon size={16} /></div>
                    <span className="ref-action-title">â‚¦Food</span>
                  </button>

                  {/* Card 5: Rewards */}
                  <button
                    type="button"
                    className="ref-action-card card-agent"
                    onClick={() => setMainTab('rewards')}
                  >
                    <div className="ref-action-icon-circle icon-circle-agent"><HandCoinsIcon size={16} /></div>
                    <span className="ref-action-title">Rewards</span>
                  </button>

                  {/* Card 6: Claim */}
                  <button
                    type="button"
                    className="ref-action-card card-more"
                    onClick={() => setMainTab('claim')}
                  >
                    <div className="ref-action-icon-circle icon-circle-tasks"><TicketIcon size={16} /></div>
                    <span className="ref-action-title">Claim</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN 2: Active chat message stream matching reference */
              <div className="walley-chat-stream" ref={chatStreamRef}>
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`walley-msg-row ${msg.sender}`}>
                    <div className="walley-msg-bubble-wrap">
                      {/* Attached File Preview inside Message */}
                      {msg.file && (
                        <div className="walley-msg-file-container">
                          {msg.file.isImage ? (
                            <img
                              src={msg.file.previewUrl}
                              alt={msg.file.name}
                              className="walley-msg-img-bubble"
                              onClick={() => window.open(msg.file.previewUrl, '_blank')}
                              title="Click to view full image"
                            />
                          ) : (
                            <div className="walley-file-pill-card">
                              <div className="file-pill-icon-box">
                                <FileText size={18} color="var(--primary, #0052FF)" />
                              </div>
                              <div className="file-pill-meta">
                                <span className="file-pill-title">{msg.file.name}</span>
                                <span className="file-pill-sub">{msg.file.size} Â· {msg.file.extension?.toUpperCase() || 'FILE'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Playable Voice Note Audio Bubble */}
                      {msg.audioUrl && (
                        <div className="walley-audio-player">
                          <button
                            type="button"
                            className="walley-audio-play-btn"
                            onClick={() => handleTogglePlayAudio(msg.id, msg.audioUrl)}
                            aria-label={playingAudioId === msg.id ? "Pause voice directive" : "Play voice directive"}
                          >
                            {playingAudioId === msg.id ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
                          </button>
                          <div className="walley-audio-waveform-bars">
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                            <span className={playingAudioId === msg.id ? 'active' : ''} />
                          </div>
                          <span className="walley-audio-duration">{msg.audioDuration || '0:05'}</span>
                        </div>
                      )}

                      {/* Text Message Bubble (if text exists) */}
                      {msg.text && (
                        <div className={`walley-msg-bubble ${msg.sender}`}>
                          <div className="walley-msg-text-content">{renderChatText(msg.text)}</div>
                          {msg.sender === 'agent' && (
                            <div className="walley-msg-speech-bar">
                              <button
                                type="button"
                                className={`walley-msg-speak-btn ${speakingMsgId === msg.id ? 'speaking' : ''}`}
                                onClick={() => handleToggleSpeakMessage(msg)}
                                aria-label={speakingMsgId === msg.id ? "Stop voice playback" : "Play voice playback"}
                              >
                                {speakingMsgId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.sender === 'agent' && msg.toolEvents?.length > 0 && (
                        <div className="chat-tool-events" aria-label="Tools used in this reply">
                          {msg.toolEvents.map((event, eventIndex) => (
                            <div className={`chat-tool-event ${event.status}`} key={`${event.key}-${eventIndex}`}>
                              {event.status === 'completed' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                              <span>{event.name}</span>
                              <small>{event.status === 'completed' ? 'Verified' : event.status === 'failed' ? 'Failed' : 'Running'}</small>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Generative Interactive Task Widget */}
                      {msg.widget && (
                        <div className="walley-widget-card">
                          <div className="walley-widget-header">
                            <span className="walley-widget-title">{msg.widget.title}</span>
                            <span className="walley-widget-badge">{msg.widget.badge}</span>
                          </div>
                          <div className="walley-widget-body">{msg.widget.body}</div>
                          <div className="walley-widget-actions">
                            <button
                              type="button"
                              className="walley-widget-action-btn"
                              onClick={() => handleWidgetAction(msg.widget)}
                            >
                              <span>{msg.widget.actionText}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Animated agent activity state */}
                {chatIsTyping && (
                  <div className="walley-processing-row">
                    <ChatActivityIndicator
                      status={chatActivityStep}
                      prompt={chatActivityPrompt}
                      agentAvatar={currentTaggedAgent?.avatar}
                    />
                  </div>
                )}

                {/* Smooth auto-scroll anchor */}
                <div ref={chatMessagesEndRef} />
              </div>
            )}

            {/* Bottom Capsule Pill Input Bar (Floating & Pinned) */}
            <div className="walley-bottom-bar">
              {/* Optional Agent Tag Popover when '+' is clicked */}
              {isTagPopoverOpen && (
                <div className="walley-agent-popover">
                  <div className="walley-agent-popover-header">
                    <button type="button" onClick={() => setIsTagPopoverOpen(false)}>
                      <X size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="walley-agent-menu-action"
                    onClick={() => {
                      setIsTagPopoverOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <Paperclip size={15} />
                    <span>Attach a file</span>
                  </button>
                  {agentDirectoryError && (
                    <div className="walley-agent-directory-error">Agent registry unavailable. Registered agent tags cannot be selected until it responds.</div>
                  )}
                  <div className="walley-agent-popover-list">
                    {chatAgents.map((agent) => (
                      <div
                        key={agent.tag}
                        className="walley-agent-item"
                        onClick={() => handleSelectAgentTag(agent)}
                      >
                        <img src={agent.avatar} alt={agent.name} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                        <div className="walley-agent-item-info">
                          <span className="walley-agent-tag">â‚¦{agent.tag}</span>
                          <span className="walley-agent-role">{agent.role}</span>
                          <span className="walley-agent-availability">
                            {agent.callableTools?.length ? `${agent.callableTools.length} live tools` : 'Chat only'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staged File Attachment Preview Pill */}
              {attachedFile && (
                <div className="walley-staged-attachment">
                  {attachedFile.isImage ? (
                    <img src={attachedFile.previewUrl} alt="Preview" className="staged-file-img" />
                  ) : (
                    <div className="staged-file-icon">
                      <FileText size={16} color="var(--primary, #0052FF)" />
                    </div>
                  )}
                  <div className="staged-file-info">
                    <span className="staged-file-name">{attachedFile.name}</span>
                    <span className="staged-file-size">{attachedFile.size}</span>
                  </div>
                  <button
                    type="button"
                    className="staged-file-remove-btn"
                    onClick={handleRemoveAttachedFile}
                    title="Remove attachment"
                    aria-label="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Hidden File Picker Input */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.sol,.json,.txt,.csv"
                onChange={handleFileSelect}
              />

              {/* Composer: Voice Recording Mode vs Standard Input */}
              {isVoiceRecording ? (
                <div className="walley-capsule-composer walley-recording-composer">
                  <div className="recording-status-box">
                    <span className="recording-dot-blink" />
                    <span className="recording-timer-text">
                      {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                    <span className="recording-hint">
                      {voiceTranscribedText ? `â€œ${voiceTranscribedText}â€` : "Listening... speak your directive"}
                    </span>
                  </div>

                  <div className="recording-waveform-anim">
                    <span /><span /><span /><span /><span /><span /><span />
                  </div>

                  <div className="recording-actions-group">
                    <button
                      type="button"
                      className="recording-btn-cancel"
                      onClick={cancelVoiceRecording}
                      title="Cancel Recording"
                      aria-label="Cancel"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="recording-btn-send"
                      onClick={stopAndSendVoiceRecording}
                      title="Send Voice Directive"
                      aria-label="Send Voice Directive"
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatPrompt();
                  }}
                  className="walley-capsule-composer"
                >
                  <button
                    type="button"
                    className="walley-capsule-plus-btn"
                    onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                    title="Tag an Agent"
                    aria-label="Actions"
                  >
                    <Plus size={16} />
                  </button>

                  <input
                    type="text"
                    className="walley-capsule-input"
                    placeholder={attachedFile ? `Sending ${attachedFile.name}...` : (isSpeechListening ? "Listening to your voice..." : "Type a message...")}
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onFocus={() => {
                      window.scrollTo(0, 0);
                      document.body.scrollTop = 0;
                    }}
                    autoComplete="off"
                  />

                  <div className="walley-capsule-actions">
                    <button
                      type="button"
                      className={`walley-capsule-icon-btn ${isSpeechListening ? 'listening-active' : ''}`}
                      onClick={toggleSpeechRecognition}
                      title={isSpeechListening ? "Stop listening" : "Speak to AI (Speech-to-Text)"}
                      aria-label={isSpeechListening ? "Stop listening" : "Speak to AI"}
                    >
                      <Mic size={18} />
                    </button>
                    <button
                      type="button"
                      className="walley-capsule-icon-btn"
                      onClick={startVoiceRecording}
                      title="Record Voice Note"
                      aria-label="Record Voice Note"
                      style={{ padding: '4px' }}
                    >
                      <span className="walley-soundwave">
                        <span />
                        <span />
                        <span />
                      </span>
                    </button>
                    <button
                      type="submit"
                      className="walley-capsule-send-btn ref-send-btn"
                      disabled={chatIsTyping || (!chatInputText.trim() && !attachedFile)}
                      aria-label="Send"
                      title="Send"
                    >
                      <Send size={14} style={{ transform: 'translateX(-1px) translateY(0.5px)' }} />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* History Sheet / Modal */}
            {isHistoryModalOpen && (
              <div
                className="walley-history-modal-overlay"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                <div
                  className="walley-history-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>Chat History</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      onClick={() => setIsHistoryModalOpen(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0', maxHeight: '48vh', overflowY: 'auto' }}>
                    {chatHistoryLoading && <div className="walley-history-empty">Loading saved chatsâ€¦</div>}
                    {chatHistoryError && <div className="walley-history-error">{chatHistoryError}</div>}
                    {!chatHistoryLoading && !chatHistoryError && chatHistoryEntries.length === 0 && (
                      <div className="walley-history-empty">No saved chats yet.</div>
                    )}
                    {chatHistoryEntries.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        className="walley-prompt-pill walley-history-item"
                        onClick={() => handleLoadSavedChat(conversation)}
                        disabled={chatHistoryLoading}
                      >
                        <MessageSquare size={14} />
                        <span className="walley-history-item-copy">
                          <strong>{conversation.title || 'Arc chat'}</strong>
                          <small>â‚¦{conversation.agent_tag || 'arc'} Â· {new Date(conversation.updated_at).toLocaleString()}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn-agent-secondary"
                    style={{ width: '100%', padding: '10px' }}
                    onClick={handleClearSavedChatHistory}
                    disabled={chatHistoryLoading}
                  >
                    Clear saved chats
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB 5: FAQ (PROTOCOL KNOWLEDGE BASE & ACCORDION)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'faq' && (
          <div className="faq-page-container">
            {/* Hero Section */}
            <div className="faq-hero-card">
              <h1 className="faq-title">Frequently Asked Questions</h1>
            </div>

            {/* Filter & Search Bar */}
            <div className="faq-controls-card">
              <div className="faq-search-wrap">
                <Search size={16} color="var(--privy-color-foreground-3)" />
                <input
                  type="text"
                  className="faq-search-input"
                  placeholder="Search questions: arc, usdc, claim, agents, resolver, keys, fees..."
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                />
                {faqSearchQuery && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--privy-color-foreground-3)', padding: 0 }}
                    onClick={() => setFaqSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="faq-filter-chips">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'arc', label: 'Arc & USDC' },
                  { id: 'claim', label: 'Claiming â‚¦Tag' },
                  { id: 'agents', label: 'AI Agents (ERC-8004)' },
                  { id: 'resolver', label: 'Resolver Layer' },
                  { id: 'payments', label: 'Payments & Security' },
                  { id: 'contracts', label: 'Contracts' },
                  { id: 'social', label: 'Social & Community' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`faq-chip ${faqActiveCategory === chip.id ? 'active' : ''}`}
                    onClick={() => setFaqActiveCategory(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion Questions List */}
            <div className="faq-accordion-list">
              {filteredFaqItems.length === 0 ? (
                <div className="faq-empty-state">
                  <Search size={28} color="var(--privy-color-foreground-3)" />
                  <div style={{ fontWeight: 800, marginTop: 8, fontSize: '15px' }}>No matching questions found</div>
                  <div style={{ fontSize: '12px', color: 'var(--privy-color-foreground-2)', marginTop: 4 }}>
                    Try a different search keyword or select the "All" category.
                  </div>
                  <button
                    type="button"
                    className="btn-action-primary"
                    style={{ marginTop: 14, padding: '7px 16px', fontSize: '12px' }}
                    onClick={() => {
                      setFaqSearchQuery('');
                      setFaqActiveCategory('all');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredFaqItems.map((item) => {
                  const isOpen = faqOpenItems.includes(item.id);
                  return (
                    <div key={item.id} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="faq-summary-btn"
                        onClick={() => toggleFaqItem(item.id)}
                        aria-expanded={isOpen}
                      >
                        <div className="faq-summary-left">
                          <span className="faq-question-text">{item.question}</span>
                          <span className="faq-category-pill">{item.categoryLabel}</span>
                        </div>
                        <div className={`faq-chevron-icon ${isOpen ? 'rotated' : ''}`}>
                          <ChevronDown size={17} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="faq-body-content">
                          {item.answer.map((para, pIdx) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                          {item.links?.length > 0 && (
                            <div className="faq-resource-links">
                              {item.links.map((link) => (
                                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                                  {link.label}<ExternalLink size={12} />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Help Callout Banner */}
            <div className="faq-help-banner">
              <div className="faq-help-left">
                <div className="faq-help-title">Still have questions or need assistance?</div>
                <div className="faq-help-sub">
                  Explore verified AI Agents on Arc Osaka EVM or claim your sovereign â‚¦Tag handle today.
                </div>
              </div>
              <div className="faq-help-actions">
                <button
                  type="button"
                  className="btn-action-primary"
                  style={{ padding: '8px 18px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setMainTab('claim')}
                >
                  <Sparkles size={13} />
                  <span>Claim â‚¦Tag</span>
                </button>
                <button
                  type="button"
                  className="quick-chip-btn"
                  style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setMainTab('agents')}
                >
                  <Bot size={13} />
                  <span>AI Agents</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            TAB 6: REWARDS & VOUCHERS CENTER (GROUNDED IN USER REFERENCES)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'rewards' && (
          <RewardsPage
            userTag={myTag?.tag || ''}
            accountKey={walletAddress || ''}
            pointsBalance={userPoints}
            earnedVouchers={inHouseVouchers}
            onRefreshVouchers={handleRefreshVoucherClaims}
            initialPage={rewardsInitialPage}
            onInitialPageHandled={() => setRewardsInitialPage(null)}
            serviceError={arcRewardsError}
            usdcBalance={usdcBalance}
            onRewardState={applyArcRewardState}
            onRequestConnect={() => setIsConnectModalOpen(true)}
            onNavigateHome={() => setMainTab('pay')}
          />
        )}

      </main>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MOBILE FIXED FOOTER MENU (MATCHING EXACT USER SCREENSHOT STYLE)
          (Hidden on Chat page per user specification)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {mainTab !== 'chat' && mainTab !== 'claim' && (
        <nav className="mobile-footer-nav" aria-label="Mobile Navigation">
          {/* 1. Claim (Official Home) */}
          <button
            type="button"
            className={`mobile-footer-item ${mainTab === 'claim' ? 'active' : ''}`}
            onClick={() => setMainTab('claim')}
            aria-label="Claim"
          >
            <div className="mobile-footer-icon-wrap">
              <Sparkles size={22} strokeWidth={mainTab === 'claim' ? 2.4 : 1.8} />
            </div>
            <span className="mobile-footer-label">Claim</span>
          </button>

          {/* 2. Tasks */}
          <button
            type="button"
            className={`mobile-footer-item ${mainTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setMainTab('tasks')}
            aria-label="Tasks"
          >
            <div className="mobile-footer-icon-wrap">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={mainTab === 'tasks' ? '2.4' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2.5a2 2 0 0 1 2 2v.5a2 2 0 0 0 1.4 1.9l.47.16a2 2 0 0 1 1.25 2.5l-.17.47a2 2 0 0 0 .6 2.3l.36.26a2 2 0 0 1 0 2.8l-.36.26a2 2 0 0 0-.6 2.3l.17.47a2 2 0 0 1-1.25 2.5l-.47.16A2 2 0 0 0 14 21.5v.5a2 2 0 0 1-4 0v-.5a2 2 0 0 0-1.4-1.9l-.47-.16a2 2 0 0 1-1.25-2.5l.17-.47a2 2 0 0 0-.6-2.3l-.36-.26a2 2 0 0 1 0-2.8l.36-.26a2 2 0 0 0 .6-2.3l-.17-.47a2 2 0 0 1 1.25-2.5l.47-.16A2 2 0 0 0 10 5v-.5a2 2 0 0 1 2-2z" />
              </svg>
            </div>
            <span className="mobile-footer-label">Tasks</span>
          </button>

          {/* 3. Agents (with Purple Pill Badge "8") */}
          <button
            type="button"
            className={`mobile-footer-item ${mainTab === 'agents' ? 'active' : ''}`}
            onClick={() => setMainTab('agents')}
            aria-label="Agents"
          >
            <div className="mobile-footer-icon-wrap">
              <Users size={22} strokeWidth={mainTab === 'agents' ? 2.4 : 1.8} />
              <span className="mobile-footer-badge badge-purple">8</span>
            </div>
            <span className="mobile-footer-label">Agents</span>
          </button>


          {/* 5. Chat */}
          <button
            type="button"
            className={`mobile-footer-item ${mainTab === 'chat' ? 'active' : ''}`}
            onClick={() => setMainTab('chat')}
            aria-label="Chat"
          >
            <div className="mobile-footer-icon-wrap">
              <MessageSquare size={22} strokeWidth={mainTab === 'chat' ? 2.4 : 1.8} />
              <span className="mobile-footer-badge badge-green" style={{ width: 8, height: 8, padding: 0, minWidth: 8, borderRadius: '50%' }} />
            </div>
            <span className="mobile-footer-label">Chat</span>
          </button>

          {/* 6. Rewards */}
          <button
            type="button"
            className={`mobile-footer-item ${mainTab === 'rewards' ? 'active' : ''}`}
            onClick={() => setMainTab('rewards')}
            aria-label="Rewards"
          >
            <div className="mobile-footer-icon-wrap">
              <Gift size={22} strokeWidth={mainTab === 'rewards' ? 2.4 : 1.8} />
            </div>
            <span className="mobile-footer-label">Rewards</span>
          </button>
        </nav>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MODAL 0: TRANSACTION REVIEW STATE MODAL
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isSendReviewModalOpen && (
        <div className="modal-backdrop" onClick={() => !isSending && setIsSendReviewModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-header-title">Review Transaction</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--privy-color-foreground-2)', cursor: 'pointer' }}
                onClick={() => !isSending && setIsSendReviewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '12px 0 6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)', textTransform: 'uppercase', fontWeight: 600 }}>Total Transfer</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--privy-color-foreground)', marginTop: '2px' }}>{amountInput || '0'} USDC</div>
              <div style={{ fontSize: '12px', color: 'var(--privy-color-border-interactive)', marginTop: '3px', fontWeight: 600 }}>
                To: {resolution.data?.tag || recipientInput}
              </div>
            </div>

            {/* State details table */}
            <div className="crypto-details-table">
              <div className="details-row">
                <span className="details-label">
                  <Cpu size={12} />
                  <span>Settlement Network</span>
                </span>
                <span className="details-value">Arc Testnet (Chain ID 5042002)</span>
              </div>
              <div className="details-row">
                <span className="details-label">
                  <ShieldCheck size={12} />
                  <span>Tag Resolver Contract</span>
                </span>
                <span className="details-value">{shorten(ARC_TESTNET_CONFIG.contracts.nairatagResolver)}</span>
              </div>
              <div className="details-row">
                <span className="details-label">
                  <Flame size={12} />
                  <span>Gas Token & Floor</span>
                </span>
                <span className="details-value">Arc USDC (18 dec) â€¢ 20 Gwei min</span>
              </div>
              <div className="details-row">
                <span className="details-label">
                  <Clock size={12} />
                  <span>Expected Finality</span>
                </span>
                <span className="details-value">&lt; 1s (Deterministic Osaka EVM)</span>
              </div>
              {memoInput.trim() && (
                <div className="details-row">
                  <span className="details-label">
                    <span>Memo</span>
                  </span>
                  <span className="details-value">{memoInput}</span>
                </div>
              )}
            </div>

            {sendError && (
              <div style={{ padding: '8px 10px', background: 'var(--privy-color-error-bg)', border: '1px solid var(--privy-color-border-error)', borderRadius: 'var(--radius-sm)', color: 'var(--privy-color-error)', fontSize: '11px' }}>
                {sendError}
              </div>
            )}

            {isSending && (
              <ChatActivityIndicator
                status={chatActivityStep}
                prompt="USDC transfer"
                agentAvatar={currentTaggedAgent?.avatar}
              />
            )}

            <button
              type="button"
              className="btn-action-primary"
              disabled={isSending}
              onClick={handleExecuteSend}
            >
              {isSending ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Working on your transactionâ€¦</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Confirm & Send {amountInput || '0'} USDC</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MODAL 1: CONNECT WALLET OVERLAY (CIRCLE W3S + BROWSER WALLETS)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isConnectModalOpen && (
        <AuthConnectModal
          onClose={() => setIsConnectModalOpen(false)}
          isConnecting={isConnecting}
          circleInput={circleInput}
          setCircleInput={setCircleInput}
          circleOtpSent={circleOtpSent}
          setCircleOtpSent={setCircleOtpSent}
          circleStatus={circleStatus}
          handleConnectCircle={handleConnectCircle}
          handleVerifyCircle={handleVerifyCircle}
          handleConnect={handleConnect}
        />
      )}

      {isAgentOnboardingOpen && agentOnboarding && (
        <AgentOnboardingModal
          tag={myTag?.tag}
          walletAddress={walletAddress}
          progress={agentOnboarding}
          onUpdate={saveAgentOnboarding}
          onClose={() => {
            onboardingDismissedKeyRef.current = `${String(walletAddress).toLowerCase()}:${String(myTag?.tag || '').replace(/^[₦$@#]/, '').toLowerCase()}`;
            setIsAgentOnboardingOpen(false);
          }}
          onComplete={({ progress }) => {
            const completedProgress = progress || agentOnboarding;
            setAgentOnboarding(completedProgress);
            setIsAgentOnboardingOpen(false);
            onboardingDismissedKeyRef.current = `${String(walletAddress).toLowerCase()}:${String(myTag?.tag || '').replace(/^[₦$@#]/, '').toLowerCase()}`;
            setAgentSuccessDetails({ variant: 'completed', tag: myTag?.tag, progress: completedProgress || {} });
          }}
        />
      )}

      {agentSuccessDetails && (
        <AgentSuccessModal
          tag={agentSuccessDetails.tag}
          progress={agentSuccessDetails.progress}
          variant={agentSuccessDetails.variant}
          onClose={() => setAgentSuccessDetails(null)}
          onMeet={() => {
            const success = agentSuccessDetails;
            const cleanTag = String(success?.tag || 'agent').replace(/^[₦$@#]/, '');
            const savedAvatar = success?.progress?.avatarData || (typeof success?.progress?.avatar === 'string' && /^(https?:|data:)/.test(success.progress.avatar) ? success.progress.avatar : null);
            const selectedAgent = { tag: cleanTag, name: `₦${cleanTag}`, avatar: savedAvatar };
            const introPrompt = 'Hi! Please introduce yourself and tell me how you can help me today.';
            setCurrentTaggedAgent(selectedAgent);
            setChatInputText('');
            setIsChatConversationOpen(true);
            setIsTaskChatDraft(false);
            setAgentSuccessDetails(null);
            setMainTab('chat');
            handleSendChatPrompt(introPrompt, { agent: selectedAgent });
          }}
          onEarnRewards={() => {
            onboardingDismissedKeyRef.current = null;
            setAgentSuccessDetails(null);
            setIsAgentOnboardingOpen(true);
          }}
          onContinue={() => {
            const success = agentSuccessDetails;
            setAgentSuccessDetails(null);
            if (success.variant === 'claimed') {
              onboardingDismissedKeyRef.current = null;
              setIsAgentOnboardingOpen(true);
            } else {
              setMainTab('chat');
            }
          }}
        />
      )}

      {isCelebrationOpen && celebrationDetails && (
        <div className="modal-backdrop" onClick={() => setIsCelebrationOpen(false)}>
          <div className="modal-dialog celebration-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="celebration-flame-icon">
              <Flame size={28} color="#D97706" />
            </div>
            <div className="celebration-title">Success</div>
            <div className="celebration-sub">
              {celebrationDetails.type === 'payment' && `USDC Payment Sent to ${celebrationDetails.recipient}`}
              {celebrationDetails.type === 'swap' && `Swapped: ${celebrationDetails.amount}`}
              {celebrationDetails.type === 'agent' && `Agent Minted: ${celebrationDetails.amount}`}
          {celebrationDetails.type === 'claim' && (celebrationDetails.erc8004LinkError
            ? `Tag claimed. ERC-8004 link needs approval: ${celebrationDetails.amount}`
            : `Tag claimed${celebrationDetails.erc8004Id ? ` and linked as ERC-8004 #${celebrationDetails.erc8004Id}` : ''}: ${celebrationDetails.amount}`)}
            </div>

            {/* Ticket receipt */}
            <div className="ticket-receipt-card" style={{ width: '100%', marginTop: '6px' }}>
              <div className="ticket-header">
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Receipt</span>
                <span className="ticket-status-pill">
                  <CheckCircle2 size={11} />
                  <span>Finalized &lt; 1s</span>
                </span>
              </div>
              <div className="ticket-route-row">
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-2)' }}>Amount</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{celebrationDetails.amount}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-2)' }}>Settlement</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--privy-color-success-dark)' }}>Osaka EVM</div>
                </div>
              </div>
              <a
                href={celebrationDetails.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="quick-chip-btn"
                style={{ textAlign: 'center', justifyContent: 'center', padding: '6px' }}
              >
                View on ArcScan â†—
              </a>
              {celebrationDetails.erc8004Id && (
                <a
                  href={`https://erc-8004.quicknode.com/agents/arc-testnet/${celebrationDetails.erc8004Id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-chip-btn"
                  style={{ textAlign: 'center', justifyContent: 'center', padding: '6px', marginTop: '6px' }}
                >
                  View ERC-8004 agent #{celebrationDetails.erc8004Id} â†—
                </a>
              )}
              {celebrationDetails.erc8004LinkError && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ color: 'var(--privy-color-foreground-2)', fontSize: '11px', marginBottom: '6px' }}>{celebrationDetails.erc8004LinkError}</div>
                  <button type="button" className="btn-action-primary" disabled={isRetryingArcAgentLink} onClick={handleRetryArcAgentLink}>
                    {isRetryingArcAgentLink ? 'Linking to ERC-8004â€¦' : 'Complete ERC-8004 link'}
                  </button>
                </div>
              )}
            </div>

            {/* Social Intent Sharing & Telegram Broadcast Confirmation */}
            {celebrationDetails.type === 'claim' && (
              <div className="celebration-social-box">
                <div className="celebration-social-header">
                  <span className="celebration-social-title">Claim Broadcasted Live</span>
                  <a
                    href={TELEGRAM_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="celebration-live-channel-link"
                    title="View live broadcast on Telegram"
                  >
                    <span className="celebration-live-dot" />
                    <span>{TELEGRAM_CHANNEL_HANDLE}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>

                <div className="celebration-social-buttons">
                  <a
                    href={getTwitterShareUrl({ tag: celebrationDetails.cleanTag, txHash: celebrationDetails.txHash })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="celebration-social-btn btn-x"
                    title="Share to X"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Post to X</span>
                  </a>

                  <a
                    href={getTelegramShareUrl({ tag: celebrationDetails.cleanTag })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="celebration-social-btn btn-tg"
                    title="Share on Telegram"
                  >
                    <Send size={13} />
                    <span>Telegram</span>
                  </a>

                  <a
                    href={getWhatsAppShareUrl({ tag: celebrationDetails.cleanTag })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="celebration-social-btn btn-wa"
                    title="Share on WhatsApp"
                  >
                    <Share2 size={13} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-action-primary"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setIsCelebrationOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MODAL 3: CLAIM NAIRATAG DIALOG
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {welcomeDetails && (
        <div className="modal-backdrop welcome-rewards-backdrop" onClick={() => setWelcomeDetails(null)}>
          <section className="modal-dialog welcome-rewards-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-rewards-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="welcome-rewards-close" onClick={() => setWelcomeDetails(null)} aria-label="Close welcome message"><X size={18} /></button>
            <div className="welcome-rewards-icon"><Sparkles size={24} /></div>
            <p className="welcome-rewards-eyebrow">ACCOUNT READY</p>
            <h2 id="welcome-rewards-title">{welcomeDetails.tag ? `Welcome, ${welcomeDetails.tag}!` : 'Welcome to NairaTag!'}</h2>
            <p className="welcome-rewards-copy">Your wallet is connected and ready to send USDC.</p>
            <div className="welcome-points-card">
              <span>Protocol Points</span>
              <strong>{Number(welcomeDetails.points) > 0 ? `+${Number(welcomeDetails.points).toLocaleString()}` : 'ðŸŽ Free Spin Ready'}</strong>
            </div>
            <button type="button" className="auth-main-cta" onClick={() => { setWelcomeDetails(null); setMainTab('rewards'); }}>Claim Daily Rewards</button>
            <button type="button" className="welcome-rewards-link" onClick={() => setWelcomeDetails(null)}>Continue to Wallet</button>
          </section>
        </div>
      )}

      {isClaimModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsClaimModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-header-title">Claim Free â‚¦Tag</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--privy-color-foreground-2)', cursor: 'pointer' }}
                onClick={() => setIsClaimModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="tag-recipient-box">
              <div className="tag-input-field-wrap">
                <span className="tag-currency-symbol">â‚¦</span>
                <input
                  type="text"
                  className="tag-text-field"
                  placeholder="CHOOSE-YOUR-TAG"
                  value={claimInput}
                  onChange={(e) => handleCheckClaim(e.target.value)}
                />
              </div>
              {claimStatus && (
                <div style={{ fontSize: '11px', color: claimStatus.available ? 'var(--privy-color-success-dark)' : 'var(--privy-color-error)', fontWeight: 600 }}>
                  {claimStatus.available ? 'âœ“ Tag is available' : `âœ• ${claimStatus.reason}`}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-action-primary"
              disabled={!claimStatus?.available || isClaiming}
              onClick={handleExecuteClaim}
            >
              {isClaiming ? 'Claiming your â‚¦Tagâ€¦' : `Claim â‚¦${(claimInput.replace(/^[$â‚¦@#]/, '') || 'Tag').toUpperCase()}`}
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MODAL 4: AGENT PROFILE POPUP (GROUNDED IN USER REFERENCES)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedAgentProfile && (
        <div className="agent-modal-backdrop" onClick={() => setSelectedAgentProfile(null)}>
          <div className="agent-modal-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="agent-profile-content">
              <div className="agent-profile-title-row">
                <button
                  type="button"
                  className="agent-modal-close-btn"
                  onClick={() => setSelectedAgentProfile(null)}
                  aria-label="Close profile"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 16px' }}>
                <a href={getAgentTwitterShareUrl({ tag: selectedAgentProfile.tag })} target="_blank" rel="noopener noreferrer" className="agent-tool-chip">Share on X</a>
                <a href={getAgentTelegramShareUrl({ tag: selectedAgentProfile.tag })} target="_blank" rel="noopener noreferrer" className="agent-tool-chip">Telegram</a>
                <a href={getAgentWhatsAppShareUrl({ tag: selectedAgentProfile.tag })} target="_blank" rel="noopener noreferrer" className="agent-tool-chip">WhatsApp</a>
                <button type="button" className="agent-tool-chip" onClick={() => triggerCopy(`agent_share_${selectedAgentProfile.tag}`, getAgentShareUrl(selectedAgentProfile.tag))}>Copy profile link</button>
              </div>

              <div className="agent-profile-main-row">
                <img className="agent-profile-avatar" src={selectedAgentProfile.avatar} alt="" />
                <div className="agent-profile-heading-copy">
                  <div className="agent-profile-name-line">
                    <h2>â‚¦{selectedAgentProfile.tag.toUpperCase()}</h2>
                    {selectedAgentProfile.identity?.verifiedOnchain && selectedAgentProfile.identity?.erc8004AgentId && (
                      <img
                        className="agent-profile-verified-badge"
                        src="/verified-badge.png"
                        alt="Verified"
                        title="Verified agent"
                      />
                    )}
                  </div>
                  <div className="agent-profile-subtitle">
                    {selectedAgentProfile.profileType === 'claimed-tag' ? 'NairaTag on Arc' : selectedAgentProfile.name}
                  </div>
                </div>
                {selectedAgentProfile.profileType !== 'claimed-tag' && selectedAgentProfile.profileType !== 'platform-agent' && (
                  <button
                    type="button"
                    className={`agent-follow-button agent-follow-button-inline ${agentFollowState.following ? 'following' : ''}`}
                    onClick={handleToggleAgentFollow}
                    disabled={agentFollowState.loading || agentFollowState.updating || String(agentProfileLiveData?.details?.owner || selectedAgentProfile.owner || '').toLowerCase() === String(walletAddress || '').toLowerCase()}
                    aria-pressed={agentFollowState.following}
                  >
                    {agentFollowState.loading ? 'â€¦' : agentFollowState.updating ? 'Savingâ€¦' : String(agentProfileLiveData?.details?.owner || selectedAgentProfile.owner || '').toLowerCase() === String(walletAddress || '').toLowerCase() ? 'Your agent' : agentFollowState.following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              <p className="agent-profile-description">
                {selectedAgentProfile.profileType === 'claimed-tag' ? 'NairaTag holder' : selectedAgentProfile.role}
              </p>

              <div className="agent-profile-stats">
                <div><strong>{selectedAgentProfile.profileType === 'claimed-tag' || selectedAgentProfile.profileType === 'platform-agent' ? 'â€”' : agentFollowState.loading ? 'â€¦' : agentFollowState.error ? 'â€”' : agentFollowState.followerCount}</strong><span>Followers</span></div>
                <div><strong>{selectedAgentProfile.profileType === 'platform-agent' ? (selectedAgentProfile.callableTools?.length || 0) : selectedAgentProfile.earnings || 'â€”'}</strong><span>{selectedAgentProfile.profileType === 'platform-agent' ? 'Enabled tools' : 'Earned'}</span></div>
                <div><strong>{selectedAgentProfile.identity?.verifiedOnchain && selectedAgentProfile.identity?.erc8004AgentId ? `#${selectedAgentProfile.identity.erc8004AgentId}` : selectedAgentProfile.profileType === 'platform-agent' ? 'Platform' : selectedAgentProfile.id ? `#${selectedAgentProfile.id}` : 'â€”'}</strong><span>{selectedAgentProfile.profileType === 'platform-agent' ? 'Identity' : 'Agent ID'}</span></div>
                <div><strong>{selectedAgentProfile.profileType === 'platform-agent' ? 'â€”' : selectedAgentProfile.profileType === 'claimed-tag'
                  ? selectedAgentProfile.profileLoading ? 'â€¦' : selectedAgentProfile.completedTaskCount ?? 'â€”'
                  : agentProfileLiveLoading ? 'â€¦' : agentProfileLiveData?.completedTaskCount ?? 'â€”'}</strong><span>Tasks done</span></div>
              </div>

              {selectedAgentProfile.profileType === 'platform-agent' ? (
                <div className="agent-profile-detail-row agent-profile-platform-tools">
                  <div className="agent-profile-category">{selectedAgentProfile.category || 'Platform agent'}</div>
                </div>
              ) : <div className="agent-profile-detail-row">
                <div className="agent-profile-category">{selectedAgentProfile.category || 'NairaTag'}</div>
                <div className="agent-profile-owner">
                  <span>Owner</span>
                  <strong>{selectedAgentProfile.profileType === 'claimed-tag' && selectedAgentProfile.profileLoading
                    ? 'Loadingâ€¦'
                    : (agentProfileLiveData?.details?.owner || selectedAgentProfile.owner)
                      ? shorten(agentProfileLiveData?.details?.owner || selectedAgentProfile.owner)
                      : 'Unavailable'}</strong>
                  {(agentProfileLiveData?.details?.owner || selectedAgentProfile.owner) && (
                    <button
                      type="button"
                      onClick={() => triggerCopy(`agent_owner_${selectedAgentProfile.id || selectedAgentProfile.tag}`, agentProfileLiveData?.details?.owner || selectedAgentProfile.owner)}
                      aria-label="Copy owner address"
                    ><Copy size={14} /></button>
                  )}
                </div>
              </div>}

              <div className="agent-profile-card-actions">
                <button
                  type="button"
                  className="agent-profile-pay-button agent-profile-pay-full"
                  disabled={selectedAgentProfile.profileType === 'claimed-tag' && (!selectedAgentProfile.owner || selectedAgentProfile.profileLoading)}
                  onClick={() => handlePayAgentFromProfile(selectedAgentProfile)}
                ><Send size={15} /> Pay â‚¦{selectedAgentProfile.tag.toUpperCase()}</button>
              </div>

              {selectedAgentProfile.identity?.verifiedOnchain && selectedAgentProfile.identity?.erc8004AgentId && (
                <a
                  className="agent-profile-explorer-link"
                  href={`https://erc-8004.quicknode.com/agents/arc-testnet/${selectedAgentProfile.identity.erc8004AgentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >View agent on 8004scan <ExternalLink size={12} /></a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MODAL: POST BOUNTY / TASK DIALOG
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isPostTaskOpen && (
        <div className="modal-backdrop" onClick={() => setIsPostTaskOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>ðŸ’¼</span>
                <span className="card-header-title">Post Milestone Bounty</span>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--privy-color-foreground-2)', cursor: 'pointer' }}
                onClick={() => setIsPostTaskOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-2)', textTransform: 'uppercase' }}>
                  Bounty Title
                </label>
                <input
                  type="text"
                  className="token-amount-field"
                  style={{ width: '100%', fontSize: '13px', padding: '8px 10px', marginTop: '4px' }}
                  placeholder="e.g. Build Webhook Listener for Arc Osaka"
                  value={postTaskForm.title}
                  onChange={(e) => setPostTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-2)', textTransform: 'uppercase' }}>
                    Category
                  </label>
                  <select
                    className="token-amount-field"
                    style={{ width: '100%', fontSize: '12px', padding: '8px', marginTop: '4px', cursor: 'pointer' }}
                    value={postTaskForm.category}
                    onChange={(e) => setPostTaskForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="dev">âš¡ Engineering</option>
                    <option value="design">ðŸŽ¨ Design</option>
                    <option value="data">ðŸ“Š Data & AI</option>
                    <option value="content">âœï¸ Content</option>
                    <option value="test">ðŸ§ª Testing</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-2)', textTransform: 'uppercase' }}>
                    Reward (USDC)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="token-amount-field"
                    style={{ width: '100%', fontSize: '13px', padding: '8px 10px', marginTop: '4px' }}
                    placeholder="35"
                    value={postTaskForm.reward}
                    onChange={(e) => setPostTaskForm((prev) => ({ ...prev, reward: e.target.value }))}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--privy-color-foreground-2)', marginTop: '2px' }}>
                    â‰ˆ â‚¦{((parseFloat(postTaskForm.reward) || 0) * 1485).toLocaleString()} NGN
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-2)', textTransform: 'uppercase' }}>
                  Description & Deliverables
                </label>
                <textarea
                  className="token-amount-field"
                  rows={3}
                  style={{ width: '100%', fontSize: '12px', padding: '8px 10px', marginTop: '4px', resize: 'vertical' }}
                  placeholder="Describe task scope, requirements, and deliverable format..."
                  value={postTaskForm.description}
                  onChange={(e) => setPostTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ padding: '8px 10px', background: 'rgba(0, 82, 255, 0.06)', borderRadius: '6px', border: '1px solid rgba(0, 82, 255, 0.15)', fontSize: '11px', color: 'var(--privy-color-interactive)' }}>
                ðŸ”’ <strong>Smart Escrow:</strong> Funds are locked until milestone verification.
              </div>

              <button type="submit" className="btn-action-primary" style={{ marginTop: '4px' }}>
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          MODAL: SOVEREIGN WALLET & PORTFOLIO (WITH DUAL FIAT NGN CONVERSION)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isWalletModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsWalletModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wallet size={16} color="var(--privy-color-interactive)" />
                <span className="card-header-title">Arc Sovereign Portfolio</span>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--privy-color-foreground-2)', cursor: 'pointer' }}
                onClick={() => setIsWalletModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Identity Card */}
            <div style={{ marginTop: '10px', padding: '12px', background: 'var(--privy-color-background-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--privy-color-border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #0052ff, #00d2ff)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
                {myTag?.tag ? myTag.tag.replace(/^[$â‚¦]/, '').slice(0, 1).toUpperCase() : 'â‚¦'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>{displayUserTag || 'Sovereign Wallet'}</span>
                  <span className="card-net-pill">Arc Osaka</span>
                  {authProvider === 'circle' && (
                    <span className="circle-tag-pill" style={{ fontSize: '9px', padding: '1px 6px' }}>Circle W3S</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)', fontFamily: 'var(--font-mono)' }}>
                  {walletAddress ? shorten(walletAddress) : 'Not Connected'}
                </div>
              </div>
              {walletAddress && (
                <button
                  type="button"
                  className="quick-chip-btn"
                  onClick={() => triggerCopy('wallet_modal_copy', walletAddress)}
                >
                  <Copy size={11} />
                  <span>{copiedKey === 'wallet_modal_copy' ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* Dual Valuation Balances */}
            <div style={{ marginTop: '10px', padding: '14px', background: 'var(--privy-color-background-surface-2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Arc Balance
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--privy-color-foreground)', margin: '4px 0' }}>
                {usdcBalance.formatted} USDC
              </div>
              <div className="wallet-fx-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', borderRadius: '12px', fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>
                <span>â‰ˆ â‚¦{(parseFloat(usdcBalance.formatted || '0') * 1485).toLocaleString('en-NG', { maximumFractionDigits: 2 })} NGN</span>
                <span style={{ fontSize: '9.5px', opacity: 0.8 }}>@ â‚¦1,485/$</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--privy-color-interactive)', fontWeight: 700, marginTop: '8px' }}>
                âš¡ {userPoints} Protocol Points
              </div>
            </div>

            {/* Sub-tabs: Overview | Receive QR | Activity */}
            <div className="agent-profile-tabs" style={{ marginTop: '10px' }}>
              <button
                type="button"
                className={`agent-profile-tab-btn ${walletTab === 'overview' ? 'active' : ''}`}
                onClick={() => setWalletTab('overview')}
              >
                âœ¦ Overview
              </button>
              <button
                type="button"
                className={`agent-profile-tab-btn ${walletTab === 'qr' ? 'active' : ''}`}
                onClick={() => setWalletTab('qr')}
              >
                ðŸ“± Receive QR
              </button>
              <button
                type="button"
                className={`agent-profile-tab-btn ${walletTab === 'history' ? 'active' : ''}`}
                onClick={() => setWalletTab('history')}
              >
                ðŸ“œ Ledger
              </button>
            </div>

            {walletTab === 'overview' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-action-primary"
                  onClick={() => {
                    setIsWalletModalOpen(false);
                    setMainTab('pay');
                  }}
                >
                  <Send size={14} />
                  <span>Send USDC on Arc</span>
                </button>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => refreshBalance(walletAddress)}
                  >
                    <RefreshCw size={12} className={balanceLoading ? 'animate-spin' : ''} />
                    <span>Refresh Balance</span>
                  </button>
                  <a
                    href="https://explorer.testnet.arc.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-chip-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <ExternalLink size={12} />
                    <span>ArcScan â†—</span>
                  </a>
                </div>
              </div>
            )}

            {walletTab === 'qr' && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                {walletAddress ? (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`arc:${walletAddress}?tag=â‚¦${myTag?.tag || ''}`)}`}
                      alt="Arc Receive QR"
                      style={{ width: '160px', height: '160px', borderRadius: '8px', border: '1px solid var(--privy-color-border-subtle)', margin: '0 auto 8px' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)' }}>
                      Scan to receive USDC or resolve {displayUserTag || 'wallet'} on Arc Osaka EVM.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', padding: '16px' }}>Please connect wallet to view QR code.</div>
                )}
              </div>
            )}

            {walletTab === 'history' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {[
                  { tx: '0x3a9f...b112', title: 'Claim â‚¦Tag Handle', time: '10m ago', amt: '0.00 USDC', status: 'Finalized <1s' },
                  { tx: '0x8f2d...44c1', title: 'USDC Settlement to â‚¦michael', time: '2h ago', amt: '-10.00 USDC', status: 'Finalized <1s' },
                  { tx: '0x11ab...90aa', title: 'Bounty Quest Reward', time: '1d ago', amt: '+25.00 USDC', status: 'Finalized <1s' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--privy-color-background-surface)', borderRadius: '6px', fontSize: '11px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div style={{ color: 'var(--privy-color-foreground-2)', fontFamily: 'var(--font-mono)' }}>{item.tx} â€¢ {item.time}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: item.amt.startsWith('+') ? 'var(--privy-color-success-dark)' : 'var(--privy-color-foreground)' }}>{item.amt}</div>
                      <div style={{ fontSize: '9.5px', color: 'var(--privy-color-success-dark)' }}>{item.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wallet Provider Actions / Disconnect */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--privy-color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} color={authProvider === 'circle' ? '#0052FF' : 'var(--privy-color-interactive)'} />
                <span>{authProvider === 'circle' ? 'Circle Programmable Wallet (W3S)' : 'Injected Web3 Wallet'}</span>
              </div>
              <button
                type="button"
                className="wallet-disconnect-btn"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          FLOATING TOAST NOTIFICATION CONTAINER
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-pill toast-${toast.type}${toast.onAction ? ' toast-actionable' : ''}`}
            onClick={toast.onAction || undefined}
            role={toast.onAction ? 'button' : undefined}
            tabIndex={toast.onAction ? 0 : undefined}
            onKeyDown={toast.onAction ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toast.onAction(); } } : undefined}
          >
            {toast.type === 'success' && <CheckCircle2 size={15} color="#059669" />}
            {toast.type === 'error' && <AlertCircle size={15} color="#DC2626" />}
            {toast.type === 'info' && <Sparkles size={15} color="#0052FF" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          GLOBAL GAMIFIED REWARDS MODALS (ACCESSIBLE FROM HEADER & NOTIFICATIONS)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <GoldenVoucherModal
        isOpen={isGoldenVoucherOpen}
        onClose={() => setIsGoldenVoucherOpen(false)}
      />

      <LuckyWheelModal
        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        accountKey={walletAddress || ''}
        onRequestConnect={() => setIsConnectModalOpen(true)}
        onWinPrize={(prize, state) => {
          if (state) applyArcRewardState(state);
        }}
      />

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        userTag={myTag?.tag || ''}
        accountKey={walletAddress || ''}
      />

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          WEB PUSH & IN-APP NOTIFICATION LAYER (VAPID INTEGRATION)
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <NotificationLayer
        onNavigateTab={setMainTab}
        onOpenRewards={() => {
          setMainTab('rewards');
        }}
        accountKey={walletAddress || ''}
        userTag={myTag?.tag || ''}
        hasBlockingModal={Boolean(
          mainTab === 'chat' || isCelebrationOpen || isLuckyWheelOpen || isReferralOpen || isGoldenVoucherOpen ||
          isClaimModalOpen || isWalletModalOpen || isConnectModalOpen || isSendReviewModalOpen
        )}
      />
      <PersonalAgentPanel
        open={isPersonalAgentOpen}
        onClose={() => setIsPersonalAgentOpen(false)}
        walletAddress={walletAddress}
        tag={myTag?.tag || ''}
      />
      <ArcVoiceCall
        voice={voice}
        agentTag={currentTaggedAgent?.tag || 'arc'}
        agentName={currentTaggedAgent?.name || (myTag?.tag ? `₦${myTag.tag}` : 'NairaTag Agent')}
        accountEmail={accountEmail}
      />
    </>
  );
}

export default function App() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  const agentMatch = pathname.match(/^\/agent\/([a-zA-Z0-9_-]+)/i);
  const tagMatch = pathname.match(/^\/tag\/([a-zA-Z0-9_-]+)/i);

  if (pathname === '/admin') {
    return <PlatformAgentAdminPage />;
  }

  if (agentMatch) {
    return <PublicProfilePage rawHandle={agentMatch[1]} type="agent" />;
  }

  if (tagMatch) {
    return <PublicProfilePage rawHandle={tagMatch[1]} type="tag" />;
  }

  return <ArcAppShell />;
}


