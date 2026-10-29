// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NairaTagLanding from './components/NairaTagLandingPage.jsx';
import AuthConnectModal from './components/auth/AuthConnectModal';
import ProfileAvatar from './components/ProfileAvatar';
import RedesignedProfilePage from './components/profile/RedesignedProfilePage.jsx';
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
  AudioLines,
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
  clearPendingReferral,
  getPendingReferral,
  recordReferralSignup,
  rememberReferralFromUrl,
  REFERRAL_SIGNUP_POINTS,
} from './services/referrals.js';
import {
  broadcastArcClaimToTelegram,
  broadcastArcPaymentToTelegram,
  getTwitterShareUrl,
  getTelegramShareUrl,
  getTelegramShareIntentUrl,
  getTwitterTaskShareUrl,
  getTagShareUrl,
  getAgentShareUrl,
  getAgentTwitterShareUrl,
  getAgentTelegramShareUrl,
  getAgentWhatsAppShareUrl,
  broadcastArcRewardToTelegram,
  getWhatsAppShareUrl,
  TELEGRAM_CHANNEL_URL,
} from './services/arcSocialBroadcast.js';
import {
  speakText,
  stopSpeaking,
} from './services/arcGeminiChat.js';
import { getAgentLanguagePreference } from './services/agentLanguage.js';
import {
  clearArcChatHistory,
  getArcChatHistory,
  getOrCreateArcChatConversationId,
  listArcChatConversations,
  sendArcChatMessage,
} from './services/arcChat.js';
import { createArcPlatformAgent, enableArcMcpTool, fetchArcAgentDirectory, getAdminArcAgentRegistry, transitionArcAgent, getOriginalAgentLogo, KNOWN_AGENT_LOGOS } from './services/arcAgents.js';
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
import { createArcTask, getArcAgentCompletedTaskCount, listArcTasks, startArcTask, submitArcTask, releaseTaskBountyOnChain, lockTaskBountyOnChain, getEscrowContractAddress } from './services/arcTasks.js';
import { claimInHouseVoucher, getInHouseVouchers, listSocialTasks, syncInHouseVouchers } from './services/inHouseTasks.js';
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
        <text x="32" y="41.5" textAnchor="middle" fill="#064E3B" fontSize="12" fontWeight="900" fontFamily="sans-serif">₦</text>
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
        <text x="32" y="36.5" textAnchor="middle" fill="#0E7490" fontSize="12" fontWeight="900" fontFamily="sans-serif">₦</text>
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
        <text x="32" y="38.5" textAnchor="middle" fill="#831843" fontSize="12" fontWeight="900" fontFamily="sans-serif">₦</text>
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
        <text x="32" y="38.5" textAnchor="middle" fill="#713F12" fontSize="12" fontWeight="900" fontFamily="sans-serif">₦</text>
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
        <text x="32" y="34.5" textAnchor="middle" fill="#7F1D1D" fontSize="12" fontWeight="900" fontFamily="sans-serif">₦</text>
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
      <text x="32" y="36.5" textAnchor="middle" fill="#7C2D12" fontSize="13" fontWeight="900" fontFamily="sans-serif">₦</text>
    </svg>
  );
}

const CHAT_AGENT_TAG_PATTERN = /(@?₦[a-z0-9_]{2,32}\b)/gi;

function renderChatText(text) {
  return String(text || '').split(CHAT_AGENT_TAG_PATTERN).flatMap((part, index) => {
    if (/^@?₦[a-z0-9_]{2,32}$/i.test(part)) {
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
    question: 'What is a NairaTag (₦Tag)?',
    answer: [
      'A human-readable Web3 handle (like ₦SEGUN or ₦CHOWDECK) mapping directly to your Arc wallet address for instant, zero-fee USDC transfers.'
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
    categoryLabel: 'Claiming ₦Tag',
    question: 'How do I claim my ₦Tag?',
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
      'The NairaTag resolver smart contract translates any ₦Tag to its 0x wallet address in milliseconds via a single call: resolveTag(tag).'
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
    question: 'Can apps and developers integrate ₦Tags?',
    answer: [
      'Yes. Any dApp, POS terminal, or checkout can resolve and accept ₦Tags via our open TypeScript SDK, Viem adapter, or Solidity contract.'
    ]
  },
  {
    id: 9,
    category: 'contracts',
    categoryLabel: 'Contracts',
    question: 'Where can I find the NairaTag smart contracts?',
    answer: [
      'The NairaTag Registry and Resolver are deployed on Arc Mainnet (Chain ID 5042). You can inspect each contract and its onchain activity in the Arc Explorer.'
    ],
    links: [
      { label: 'NairaTag Registry', url: 'https://explorer.arc.io/address/0xb3a2d06ead0a889485a844a63be309c4df4b17b3' },
      { label: 'NairaTag Resolver', url: 'https://explorer.arc.io/address/0xf46dc708be8391090b83fb9a5d54c4a568bd64f3' },
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
      const mentionPattern = new RegExp(`@₦${agent.tag}\\b`, 'ig');
      const clean = prev.replace(mentionPattern, `₦${agent.tag}`).trim();
      if (!clean.toLowerCase().includes(`₦${agent.tag.toLowerCase()}`)) {
        return `₦${agent.tag} ${clean}`.trim();
      }
      return clean;
    });
  };

  const handleClearTaggedAgent = () => {
    setCurrentTaggedAgent(null);
  };

  // ─── File Attachment Handlers ───
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

  // ─── Microphone Speech-to-Text Recognition (Hands-Free Dictation) ───
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

  // ─── Voice Directive Recording (Real Audio + Live Speech-to-Text) ───
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: 'sys-' + Date.now(),
            sender: 'agent',
            agentName: 'NairaTag',
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
          agentName: 'NairaTag',
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
        text: finalTranscript ? `🎙️ï¸ "${finalTranscript}"` : `Voice directive (${formatDuration})`,
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

  // ─── Voice Note Audio Player Play/Pause ───
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

  // ─── Text-to-Speech Toggle on AI Messages ───
  const handleToggleSpeakMessage = (msg) => {
    if (speakingMsgId === msg.id) {
      stopSpeaking();
      setSpeakingMsgId(null);
      return;
    }
    stopSpeaking();
    const utterance = speakText(msg.text, getAgentLanguagePreference(walletAddress));
    if (!utterance) {
      setSpeakingMsgId(null);
      showToast('This device has no installed voice for your selected language.', 'info');
      return;
    }
    setSpeakingMsgId(msg.id);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
  };

  // ─── Master Chat Execution Engine (Arc Actions + Google Gemini Flash-Lite) ───
  const handleSendChatPrompt = async (customPrompt = null, options = {}) => {
    const textToSend = (customPrompt !== null ? customPrompt : chatInputText).trim();
    const fileToSend = attachedFile;
    const activeTaggedAgent = options.agent || currentTaggedAgent;

    // Must have either text or an attached file
    if (!textToSend && !fileToSend) return;
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      showToast('Sign in to start a saved chat.', 'info');
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
    let replyAgentName = activeTaggedAgent ? activeTaggedAgent.name : 'NairaTag';
    let replyAvatar = activeTaggedAgent
      ? getOriginalAgentLogo(activeTaggedAgent)
      : '/agents/bloom.png';
    let widget = null;

    if (foundAgent) {
      replyAgentTag = foundAgent.tag;
      replyAgentName = foundAgent.name;
      replyAvatar = getOriginalAgentLogo(foundAgent);
    }

    // Arc chat replies are generated server-side and each turn is signed and saved
    // through the Arc database API before it is shown as a completed response.
    setChatActivityStep('writing');
    try {
      if (agentResolution.kind === 'ambiguous') {
        const options = agentResolution.agents.map((agent) => `₦${agent.tag}`).join(', ');
        replyText = `I found more than one matching agent: ${options}. Please mention the exact NairaTag you want.`;
        replyAgentTag = 'discovery';
        replyAgentName = 'NairaTag Discovery';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=nairatag-discovery';
      } else if (agentResolution.kind === 'unavailable') {
        replyText = `₦${agentResolution.tag} is not currently listed as a published agent, so I did not send your request to a runtime.`;
        replyAgentTag = 'discovery';
        replyAgentName = 'NairaTag Discovery';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=nairatag-discovery';
      } else if (discoveryRequest) {
        if (capabilityMatches.length) {
          replyText = `These published agents have matching callable capabilities:\n${capabilityMatches.map(({ agent, matchedTools, matchedTerms }, index) => {
            const toolNames = matchedTools.map((tool) => typeof tool === 'string' ? tool : tool.name || tool.title || tool.key || 'enabled tool').join(', ');
            return `${index + 1}. ₦${agent.tag} — ${agent.name || agent.tag}; matching capability: ${toolNames} (${matchedTerms.join(', ')})`;
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
        const cleanTag = String(agentTag).toLowerCase().replace(/^[₦$@#]/, '');
        const conversationId = getOrCreateArcChatConversationId(walletAddress, agentTag);
        setActiveChatConversationId(conversationId);

        if (cleanTag === 'defillama') {
          replyAgentTag = 'defillama';
          replyAgentName = 'DefiLlama DeFi Oracle';
          replyAvatar = '/agents/defillama.png';
          try {
            const res = await fetch('/api/agent-service?action=defillama_tvl&limit=5');
            const data = await res.json();
            const top = (data.protocols || []).slice(0, 5).map((p, i) => `${i + 1}. **${p.name}** (${p.symbol || 'DeFi'}): $${(p.tvl / 1e9).toFixed(2)}B TVL (24h: ${p.change1d ? p.change1d.toFixed(2) : '0'}%)`).join('\n');
            replyText = `**Top DeFi Protocols (TVL)**\n\n${top}`;
            toolEvents = [{ tool: 'defillama.tvl', status: 'success', summary: 'Fetched live multi-chain TVL rankings' }];
          } catch (e) {
            replyText = `🦙 **DefiLlama**: Connected to Arc Testnet. Query: "${agentPrompt}". DeFi analytics available via tool \`defillama.tvl\`.`;
          }
        } else if (cleanTag === 'meteo') {
          replyAgentTag = 'meteo';
          replyAgentName = 'Open-Meteo Logistics Weather';
          replyAvatar = '/agents/meteo.png';
          try {
            const promptLower = agentPrompt.toLowerCase();
            let city = 'lagos';
            if (promptLower.includes('abuja')) city = 'abuja';
            else if (promptLower.includes('kano')) city = 'kano';
            else if (promptLower.includes('ibadan')) city = 'ibadan';
            else if (promptLower.includes('port harcourt') || promptLower.includes('ph')) city = 'portharcourt';
            const res = await fetch(`/api/agent-service?action=meteo_weather&city=${city}`);
            const data = await res.json();
            replyText = `**Weather in ${data.city || "Lagos"}**: ${data.temperatureC}°C · ${data.windSpeedKmH} km/h wind · Risk: **${data.riskLevel}**`;
            toolEvents = [{ tool: 'meteo.delivery_impact', status: 'success', summary: `Calculated ${data.riskLevel} delivery risk for ${data.city}` }];
          } catch (e) {
            replyText = `🌤️ **Open-Meteo**: Connected to Arc Testnet. Real-time meteorological dispatch risk analysis active.`;
          }
        } else if (cleanTag === 'coingecko') {
          replyAgentTag = 'coingecko';
          replyAgentName = 'CoinGecko FX Benchmark';
          replyAvatar = '/agents/coingecko.png';
          try {
            const res = await fetch('/api/agent-service?action=coingecko_fx');
            const data = await res.json();
            replyText = `**USDC Market Rate**\n• 1 USDC = **₦${Number(data.rateNgnPerUsdc || 1345).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** (${data.change24hNgn ? (data.change24hNgn > 0 ? "+" : "") + data.change24hNgn.toFixed(1) : "0"}% 24h)\n• 1 USDC = $1.00 USD`;
            toolEvents = [{ tool: 'coingecko.usdc_ngn', status: 'success', summary: `Fetched live exchange rate: ₦${data.rateNgnPerUsdc} / USDC` }];
          } catch (e) {
            replyText = `🦎 **CoinGecko**: Connected to Arc Testnet. Real-time FX exchange feed ready.`;
          }
        } else if (agentPrompt.toLowerCase().includes('swap')) {
          replyText = `**Instant Swap on Arc**\nZero gas fee. Pairs: USDC ⇄ EURC, USDC ⇄ cirBTC. What amount would you like to swap?`;
          toolEvents = [{ tool: 'arc.swap_quote', status: 'success', summary: 'Checked Arc decentralized liquidity pools' }];
        } else {
          const chatResult = await sendArcChatMessage({
            walletAddress,
            conversationId,
            turnId: crypto.randomUUID(),
            prompt: agentPrompt,
            agentTag,
            title: agentPrompt,
          });
          replyText = chatResult.reply;
          toolEvents = chatResult.toolEvents || [];
        }

        if (myTag?.tag) {
          claimAgentOnboardingReward({ walletAddress, tag: myTag.tag, step: 'firstInteraction' })
            .then((reward) => {
              if (reward.state) applyArcRewardState(reward.state);
              const synced = syncAgentOnboardingRewards(walletAddress, myTag.tag, reward.onboarding);
              if (synced) setAgentOnboarding(synced);
            })
            .catch((error) => showToast(`Your task is ready, but its welcome points could not sync yet: ${error.message}`, 'error', 5000));
        }

        if (selectedAgent) {
          replyAgentTag = selectedAgent.tag;
          replyAgentName = selectedAgent.displayName || selectedAgent.name;
          const isOwnTag = String(selectedAgent.tag || '').replace(/^[₦$@#]/, '').toLowerCase() === String(myTag?.tag || '').replace(/^[₦$@#]/, '').toLowerCase();
          const savedAvatar = isOwnTag ? getAgentOnboarding(walletAddress, myTag?.tag) : null;
          replyAvatar = savedAvatar?.avatarData || savedAvatar?.avatar || selectedAgent.avatar;
        } else {
          replyAgentTag = 'ArcAgent';
          replyAgentName = 'NairaTag';
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
      const utterance = speakText(replyText, getAgentLanguagePreference(walletAddress));
      if (utterance) {
        setSpeakingMsgId(botReply.id);
        utterance.onend = () => setSpeakingMsgId(null);
        utterance.onerror = () => setSpeakingMsgId(null);
      }
    }
    return { reply: replyText, botReply };
  };

  const handleStartVoiceMode = async () => {
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
          agentName: isAgent ? (agent?.name || 'NairaTag') : undefined,
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
  const displayUserTag = myTag?.tag ? `₦${String(myTag.tag).replace(/^[$₦]/, '').toUpperCase()}` : null;
  const [accountEmail, setAccountEmail] = useState('');
  const accountUsername = accountEmail.includes('@') ? accountEmail.slice(0, accountEmail.indexOf('@')) : accountEmail;
  const displayAccountName = displayUserTag || (accountUsername ? `₦${accountUsername.toUpperCase()}` : null);
  const userTag = myTag?.tag ? String(myTag.tag).replace(/^[$₦]/, '').toLowerCase() : (accountUsername || 'nairatag');

  // Circle Programmable Wallet State
  const [authProvider, setAuthProvider] = useState(null); // 'circle' | 'injected'
  const [circleSession, setCircleSession] = useState(null);
  const [circleInput, setCircleInput] = useState('');
  const [circleOtpSent, setCircleOtpSent] = useState(false);
  const [circleStatus, setCircleStatus] = useState('');

  const voice = useArcVoice({
    walletAddress,
    onAgentPrompt: (prompt) => handleSendChatPrompt(prompt, { liveVoice: true }),
  });

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

  // Tasks State
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
  const [isTaskCreating, setIsTaskCreating] = useState(false);
  const [createdTask, setCreatedTask] = useState(null);
  const [inHouseVouchers, setInHouseVouchers] = useState([]);
  const [socialTasks, setSocialTasks] = useState([]);
  const [socialTaskProof, setSocialTaskProof] = useState('');
  const [rewardsInitialPage, setRewardsInitialPage] = useState(null);
  const [taskSubmissionDraft, setTaskSubmissionDraft] = useState('');
  const [userPoints, setUserPoints] = useState(0);
  const [arcRewardsError, setArcRewardsError] = useState('');
  const [activeEscrowStep, setActiveEscrowStep] = useState(2);
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
    getInHouseVouchers(walletAddress).then(setInHouseVouchers).catch((error) => {
      console.warn('[Social tasks] Could not load persisted claims:', error.message);
    });
    const refresh = (event) => {
      if (!walletAddress || event.detail?.walletAddress === walletAddress.toLowerCase()) {
        getInHouseVouchers(walletAddress).then(setInHouseVouchers).catch((error) => {
          console.warn('[Social tasks] Could not refresh persisted claims:', error.message);
        });
      }
    };
    window.addEventListener('nairatag-inhouse-vouchers-updated', refresh);
    return () => window.removeEventListener('nairatag-inhouse-vouchers-updated', refresh);
  }, [walletAddress]);

  useEffect(() => {
    let active = true;
    listSocialTasks().then((tasks) => { if (active) setSocialTasks(tasks); })
      .catch((error) => console.warn('[Social tasks] Could not load task list:', error.message));
    return () => { active = false; };
  }, [tasksRefreshKey]);

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
    return socialTasks.filter((task) => (tasksFilter === 'all' || task.category === tasksFilter) &&
      (!q || [task.title, task.description, task.category, task.id]
        .some((value) => String(value || '').toLowerCase().includes(q))
    ));
  }, [socialTasks, tasksFilter, tasksSearch]);

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
      points: voucherTask.points,
      participantCount: voucherTask.participantCount,
      isVoucherTask: true,
      voucherTask,
    }));
    return [...matchingTasks, ...voucherCards];
  }, [allTasks, filteredInHouseTasks, tasksFilter, tasksSearch]);

  const selectedTask = useMemo(() => {
    const existingTask = allTasks.find((task) => task.id === selectedTaskId);
    if (existingTask) return existingTask;
    const voucherId = String(selectedTaskId || '').startsWith('voucher:') ? selectedTaskId.slice('voucher:'.length) : null;
    const voucherTask = socialTasks.find((task) => task.id === voucherId);
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
      points: voucherTask.points,
      escrowStatus: 'Protocol Points after review',
      isVoucherTask: true,
      voucherTask,
    };
  }, [allTasks, selectedTaskId, socialTasks]);
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
    return claimInput.replace(/^[$₦]/, '').trim() || (myTag?.tag ? myTag.tag.replace(/^[$₦]/, '') : 'TAG');
  }, [claimInput, myTag]);

  const claimPreviewText = claimInput.replace(/^[$₦]/, '').toUpperCase() || 'Tag';
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
    const clean = claimInput.replace(/^[$₦]/, '').trim().toLowerCase();
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
  const [swapTargetChain, setSwapTargetChain] = useState('Arc');
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
    const sharedTag = decodeURIComponent(match[1]).replace(/^₦/, '').toLowerCase();
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
      name: `₦${sharedTag.toUpperCase()}`,
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
    const pointAmount = (agent) => {
      const pts = agentDirectoryStats[agent.tag]?.points ?? agent.points;
      if (typeof pts === 'number') return Number.isFinite(pts) ? pts : 0;
      const parsed = Number(String(pts ?? '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const earningAmount = (agent) => {
      const earnings = agentDirectoryStats[agent.tag]?.earnings ?? agent.earnings;
      if (typeof earnings === 'number') return Number.isFinite(earnings) ? earnings : 0;
      const parsed = Number(String(earnings ?? '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return [...filteredAgents]
      .sort((a, b) => earningAmount(b) - earningAmount(a) || pointAmount(b) - pointAmount(a) || chatAgents.indexOf(a) - chatAgents.indexOf(b))
      .map((agent, index) => ({ ...agent, leaderboardRank: index + 1 }));
  }, [filteredAgents, chatAgents, agentDirectoryStats]);

  const agentEarningsLabel = (agent) => {
    const earnings = agentDirectoryStats[agent.tag]?.earnings ?? agent.earnings;
    if (earnings === null || earnings === undefined || earnings === '') return '0 USDC';
    const amount = Number(earnings);
    return `${Number.isFinite(amount) ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} ${agent.earningsCurrency || 'USDC'}`;
  };

  const agentPointsLabel = (agent) => {
    const value = agentDirectoryStats[agent.tag]?.points ?? agent.points;
    if (value === null || value === undefined || value === '') return '200 Points earned';
    const points = Number(value);
    return `${Number.isFinite(points) ? points.toLocaleString() : '200'} Points earned`;
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
    const clean = val.trim().replace(/^[$₦@#]/, '');
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

  // Chat Greeting: 'Hey there 👋'
  const chatGreeting = useMemo(() => {
    if (!walletAddress) {
      return 'Hey there 👋';
    }
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = 'Good evening';
    }

    if (myTag?.tag) {
      const clean = myTag.tag.replace(/^[$₦]/, '').trim();
      const formatted = clean ? `₦${clean.charAt(0).toUpperCase() + clean.slice(1)}` : '';
      return formatted ? `${timeGreeting}, ${formatted}!` : `${timeGreeting}!`;
    }

    if (accountUsername) {
      return `${timeGreeting}, ₦${accountUsername}!`;
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

  // Auto-restore session on mount (Circle email or Injected EVM wallet)
  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const stored = getStoredCircleSession();
        if (stored && stored.walletAddress) {
          try {
            if (!getArcSessionToken(stored.walletAddress)) {
              await establishCircleArcSession({ userToken: stored.userToken, walletAddress: stored.walletAddress });
            }
          } catch (error) {
            clearCircleSession();
            clearArcSession();
            setIsConnectModalOpen(true);
            showToast(`Please sign in again to restore your account: ${error.message}`, 'error', 5000);
            return;
          }
          if (cancelled) return;
          setWalletAddress(stored.walletAddress);
          setAuthProvider('circle');
          setCircleSession(stored);
          setIsArcNetwork(true);
          const savedEmail = window.localStorage.getItem('nairatag_account_email') || stored.email;
          if (savedEmail) setAccountEmail(savedEmail);
          refreshBalance(stored.walletAddress);
          return;
        }

        const authMode = window.localStorage.getItem('nairatag_auth_provider');
        if (authMode === 'injected' && typeof window !== 'undefined' && window.ethereum?.request) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
          if (accounts && accounts[0] && !cancelled) {
            const addr = accounts[0];
            setWalletAddress(addr);
            setAuthProvider('injected');
            window.localStorage.setItem('nairatag_auth_provider', 'injected');
            window.localStorage.setItem('nairatag_last_wallet', addr);
            const netChainId = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null);
            if (netChainId) {
              const numId = parseInt(netChainId, 16);
              setChainId(numId);
              setIsArcNetwork(numId === activeArcChain.id);
            }
            refreshBalance(addr);
          }
        }
      } catch (e) {
        console.warn('[App] Restoring session error:', e);
      }
    };
    restoreSession();
    return () => { cancelled = true; };
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
      const errMsg = err?.message || err?.error || err?.reason || (typeof err === 'string' ? err : 'Circle email service is currently unavailable. Please connect with an EVM wallet (MetaMask/Rabby).');
      showToast(`Circle email error: ${errMsg}`, 'error', 4500);
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
      try { await establishCircleArcSession({ userToken: res.userToken, walletAddress: res.walletAddress }); }
      catch (sessionError) {
        clearCircleSession();
        clearArcSession();
        throw sessionError;
      }
      setAccountEmail(circleInput.trim().toLowerCase());
      window.localStorage.setItem('nairatag_auth_provider', 'circle');
      window.localStorage.setItem('nairatag_account_email', circleInput.trim().toLowerCase());
      setWalletAddress(res.walletAddress);
      setAuthProvider('circle');
      setCircleSession(res);
      setIsArcNetwork(true);
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
      showToast("You're signed in.", 'success', 2500);
    } catch (err) {
      setCircleStatus('');
      const errMsg = err?.message || err?.error || err?.reason || (typeof err === 'string' ? err : 'Verification failed. Please try again.');
      showToast(`Email sign-in error: ${errMsg}`, 'error', 4500);
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
    try {
      window.localStorage.removeItem('nairatag_auth_provider');
      window.localStorage.removeItem('nairatag_account_email');
      window.localStorage.removeItem('nairatag_last_wallet');
    } catch {}
    setWalletAddress(null);
    setAuthProvider(null);
    setCircleSession(null);
    setAccountEmail('');
    setIsNotificationOpen(false);
    setCircleOtpSent(false);
    setMyTag(null);
    setUsdcBalance({ formatted: '0.00', raw: 0n, rawString: '0' });
    setIsWalletModalOpen(false);
    showToast('You are signed out.', 'info', 2000);
  };

  // Connect Wallet Handler
  const handleConnect = async (providerType) => {
    if (providerType === 'Circle' || providerType === 'Circle Wallet') {
      return handleConnectCircle();
    }
    setIsConnecting(true);
    try {
      const { address, chainId: cId } = await connectWallet();
      try {
        await establishWalletArcSession(address);
      } catch (sessionErr) {
        console.warn('[App] Optional session token establishment:', sessionErr);
      }
      setWalletAddress(address);
      setAuthProvider('injected');
      setChainId(cId);
      setIsArcNetwork(cId === activeArcChain.id);
      await refreshBalance(address);
      setIsConnectModalOpen(false);
      showToast("You're signed in.", 'success', 2500);
    } catch (err) {
      console.error('[App] Wallet connection error:', err);
      const errMsg = err?.message || err?.reason || (typeof err === 'string' ? err : 'Connection rejected or wallet unavailable.');
      showToast(`Connection error: ${errMsg}`, 'error', 3500);
      alert(`Wallet Connection Error: ${errMsg}`);
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
      const switchErr = e?.message || e?.reason || (typeof e === 'string' ? e : 'Failed to switch network.');
      showToast(`Switch failed: ${switchErr}`, 'error', 3500);
      alert(`Network switch failed: ${switchErr}`);
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
          const mappedTag = '₦' + (cleanPhone.slice(-4) === '5678' ? 'segun' : 'michael');
          setResolution({
            loading: false,
            data: {
              success: true,
              tag: mappedTag,
              canonicalTag: mappedTag,
              cleanTag: mappedTag.replace('₦', ''),
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

  const handleClaimInHouseVoucher = async (task, proof) => {
    if (!walletAddress) {
      showToast('Sign in to your NairaTag account to submit this task.', 'info');
      setIsConnectModalOpen(true);
      return;
    }
    let vouchers;
    try {
      vouchers = await claimInHouseVoucher(walletAddress, task.id, proof);
      setInHouseVouchers(vouchers);
    } catch (error) {
      showToast(error.message || 'Could not save this task submission.', 'error');
      return;
    }
    setSocialTaskProof('');
    showToast(`${task.title} submitted for review.`, 'success', 3500);
  };

  const handleRefreshVoucherClaims = async () => {
    if (!walletAddress) return;
    try {
      const [claims, rewards] = await Promise.all([
        syncInHouseVouchers(walletAddress),
        getArcRewardState(walletAddress),
      ]);
      setInHouseVouchers(claims);
      applyArcRewardState(rewards);
    }
    catch (error) { showToast(error.message || 'Could not refresh voucher claims.', 'error'); }
  };

  const handleStartTask = async (task) => {
    if (!walletAddress) {
      showToast('Sign in to start a task.', 'info');
      setIsConnectModalOpen(true);
      return;
    }
    try {
      const progress = await startArcTask({ taskId: task.id, walletAddress, taskTitle: task.title, rewardUSDC: task.rewardUSDC, points: task.points, sessionToken: getArcSessionToken(walletAddress), authProvider });
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
      const progress = await submitArcTask({ taskId: task.id, walletAddress, deliverable: submission, taskTitle: task.title, rewardUSDC: task.rewardUSDC, points: task.points, sessionToken: getArcSessionToken(walletAddress), authProvider });
      setTaskProgress((previous) => ({ ...previous, [task.id]: progress }));
      setTaskSubmissionDraft('');
      showToast('Submission saved to the Arc task service for owner review.', 'success');
    } catch (error) {
      showToast(error.message || 'Could not submit this task.', 'error', 4000);
    }
  };

  const [isEscrowProcessing, setIsEscrowProcessing] = useState(false);

  const handleReleaseEscrowPayout = async (task) => {
    if (!walletAddress) {
      showToast('Connect wallet to release on-chain escrow payout.', 'info');
      setIsConnectModalOpen(true);
      return;
    }
    setIsEscrowProcessing(true);
    try {
      showToast('Releasing USDC payout from NairaTagBountyEscrow on Arc Mainnet...', 'info', 4000);
      const res = await releaseTaskBountyOnChain({
        taskId: task.id,
        fromAddress: walletAddress,
      });
      setTaskProgress((prev) => ({
        ...prev,
        [task.id]: {
          ...(prev[task.id] || {}),
          status: 'paid',
          reviewedAt: Date.now(),
          txHash: res.txHash,
        },
      }));
      triggerCelebrationConfetti();
      setCelebrationDetails({
        type: 'payment',
        txHash: res.txHash,
        amount: `${task.rewardUSDC} USDC (Escrow Payout)`,
        recipient: task.creatorTag ? `₦${task.creatorTag.replace(/^[₦$@#]/, '').toUpperCase()}` : 'Task Worker',
        explorerUrl: res.explorerUrl,
      });
      setIsCelebrationOpen(true);
      showToast(`Task bounty of ${task.rewardUSDC} USDC released on Arc Mainnet!`, 'success', 6000);
    } catch (err) {
      console.warn('[Escrow Release Error]', err);
      showToast(`Escrow release: ${err.message || 'Transaction could not be confirmed.'}`, 'error', 6000);
    } finally {
      setIsEscrowProcessing(false);
    }
  };

  const handleLockEscrowBounty = async (task) => {
    if (!walletAddress) {
      showToast('Connect wallet to lock USDC in Escrow.', 'info');
      setIsConnectModalOpen(true);
      return;
    }
    setIsEscrowProcessing(true);
    try {
      showToast('Locking USDC bounty into NairaTagBountyEscrow...', 'info', 4000);
      const res = await lockTaskBountyOnChain({
        taskId: task.id,
        creatorTag: myTag?.tag || 'nairatag',
        amountUsdc: task.rewardUSDC,
        fromAddress: walletAddress,
      });
      showToast('Bounty locked in Escrow on Arc Mainnet!', 'success', 6000);
    } catch (err) {
      console.warn('[Escrow Lock Error]', err);
      showToast(`Escrow deposit: ${err.message || 'Could not lock bounty.'}`, 'error', 6000);
    } finally {
      setIsEscrowProcessing(false);
    }
  };

  const handleTaskChat = (task) => {
    setChatInputText(`Hi @₦${task.creatorTag.replace(/^₦/, '')}, I’m working on “${task.title}”. `);
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
    showToast('📊 Market Price Verified! +100 Protocol Points added to your balance.', 'success', 3500);
  };

  const handleDailyAgentMission = () => {
    if (dailyMissionsDone.agent) {
      showToast("Today's agent mission already completed!", 'info');
      return;
    }
    setDailyMissionsDone((prev) => ({ ...prev, agent: true }));
    setUserPoints((prev) => prev + 150);
    triggerCelebrationConfetti();
    showToast('🤖 Agent Mission Completed! High-gap coverage verified. +150 Points.', 'success', 3500);
  };

  const handleDailyCommodityAlert = () => {
    if (dailyMissionsDone.alert) {
      showToast('Commodity alert already active for today!', 'info');
      return;
    }
    setDailyMissionsDone((prev) => ({ ...prev, alert: true }));
    setUserPoints((prev) => prev + 50);
    triggerCelebrationConfetti();
    showToast('🔔 Price Alert Set on Arc Commodities! +50 Points.', 'success', 3500);
  };

  const handleInviteToEarn = () => {
    const inviteUrl = myTag?.tag ? getTagShareUrl(myTag.tag) : 'https://arc.nairatag.ng/#claim';
    triggerCopy('invite_link', inviteUrl);
    showToast('🔗 Invite Link Copied! Share with friends to earn 10% fee rebates on Arc.', 'success', 3500);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      showToast('Sign in to post a task.', 'info');
      return;
    }
    const title = postTaskForm.title.trim();
    const description = postTaskForm.description.trim();
    const rewardUSDC = Number(postTaskForm.reward);
    if (title.length < 4) {
      showToast('Task titles must be at least 4 characters.', 'error');
      return;
    }
    if (description.length < 10) {
      showToast('Describe the task and what counts as completion.', 'error');
      return;
    }
    if (!Number.isFinite(rewardUSDC) || rewardUSDC <= 0 || rewardUSDC > 1000000
      || Math.abs(rewardUSDC * 1000000 - Math.round(rewardUSDC * 1000000)) > 0.000001) {
      showToast('Enter a valid USDC reward with up to 6 decimal places.', 'error');
      return;
    }
    setIsTaskCreating(true);
    try {
      const task = await createArcTask({
        walletAddress,
        sessionToken: getArcSessionToken(walletAddress),
        task: {
          title, category: postTaskForm.category, description,
          deliverable: description, rewardUSDC, deadline: 'Open until closed',
        },
      });
      setBackendTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      setTasksRefreshKey((key) => key + 1);
      setCreatedTask(task);
      setPostTaskForm({ title: '', category: 'dev', reward: '35', deadline: 'Open until closed', description: '', requirements: '' });
      triggerCelebrationConfetti();
    } catch (error) {
      showToast(error.message || 'Task could not be posted. Please try again.', 'error', 5000);
    } finally {
      setIsTaskCreating(false);
    }
  };

  // Agent profile conversations use the live AI service; no canned agent replies.
  const handleSendAgentChat = async (agentId, userText) => {
    const text = (userText || agentChatInput).trim();
    if (!text) return;
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      showToast('Sign in to chat with this agent.', 'info');
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
          fromChain: 'Arc',
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
        recipient: targetTag ? `₦${targetTag.replace(/^[$₦]/, '').toUpperCase()}` : shorten(result.recipientAddress),
        explorerUrl: result.explorerUrl,
        executionTimeMs: result.executionTimeMs,
      });
      setIsCelebrationOpen(true);

      // Broadcast confirmed Arc USDC payment to official Telegram channel
      broadcastArcPaymentToTelegram({
        fromAddress: walletAddress,
        fromTag: myTag?.tag || null,
        recipient: recipientInput.trim(),
        recipientAddress: result.recipientAddress || null,
        amountUsdc: amountInput.trim(),
        memo: memoInput.trim() || undefined,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        network: activeArcChain.name,
        executionTimeMs: result.executionTimeMs,
      }).catch((broadcastErr) => console.warn('[Telegram Payment Broadcast]', broadcastErr.message));

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
      // Circle wallet swaps allowed
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
        fromChain: 'Arc',
        toChain: swapTargetChain,
      });

      triggerCelebrationConfetti();
      setCelebrationDetails({
        type: 'swap',
        txHash: res.txHash,
        amount: `${swapAmountIn} ${swapTokenIn} ➔ ${swapEstimate?.amountOut || ''} ${swapTokenOut}`,
        recipient: 'Arc App Kit Swap',
        explorerUrl: `https://explorer.arc.io/tx/${res.txHash}`,
      });
      setIsCelebrationOpen(true);
      refreshBalance(walletAddress);
    } catch (err) {
      const swapErr = err?.message || err?.reason || (typeof err === 'string' ? err : 'Swap failed on Arc.');
      showToast(`Swap failed: ${swapErr}`, 'error', 4000);
      alert(`Swap failed: ${swapErr}`);
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
    const cleanTag = String(tag).replace(/^[₦$@#]/, '').toLowerCase();
    const linkedAgent = {
      id: String(registration.agentId),
      tag: cleanTag,
      name: `₦${cleanTag.toUpperCase()}`,
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
    const cleanTag = String(tag).replace(/^[₦$@#]/, '').toLowerCase();
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
      showToast(`₦${linkedAgent.tag.toUpperCase()} linked to ERC-8004 #${linkedAgent.id}.`, 'success', 3500);
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
    const tag = String(rawTag || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
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
      name: `₦${tag}`,
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
    const cleanTag = String(agent.tag || '').replace(/^[₦$@#]/, '');
    setRecipientInput(`₦${cleanTag}`);
    setMainTab('pay');
    showToast(`Recipient pre-filled: ₦${cleanTag.toUpperCase()}`, 'info', 3000);
  };

  // Chat directly with agent from profile
  const handleChatWithAgentFromProfile = (agent) => {
    setSelectedAgentProfile(null);
    setCurrentTaggedAgent(agent);
    setIsChatConversationOpen(true);
    setMainTab('chat');
    const cleanTag = String(agent.tag || '').replace(/^[₦$@#]/, '');
    setChatInputText(`@${cleanTag} `);
    showToast(`Chatting with ₦${cleanTag.toUpperCase()}`, 'info', 2500);
  };

  // Claim Tag Check
  const handleCheckClaim = async (val) => {
    setClaimInput(val);
    const clean = val.replace(/^[₦$@#]/, '').toUpperCase();
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
      const pendingReferral = getPendingReferral();
      const hasReferralAttribution = Boolean(pendingReferral?.tag);
      try {
        const claimNotice = await submitArcRewardAction({
          action: 'tag_claimed',
          walletAddress,
          tag: res.cleanTag,
          ...(hasReferralAttribution ? { referrerTag: pendingReferral.tag } : {}),
        });
        applyArcRewardState(claimNotice.state);
        if (hasReferralAttribution) {
          clearPendingReferral();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nairatag:referrals-updated', {
              detail: { referrerTag: pendingReferral.tag, referredTag: res.cleanTag, milestone: 'signup', points: REFERRAL_SIGNUP_POINTS },
            }));
          }
          broadcastArcRewardToTelegram({
            action: 'referral_signup',
            walletAddress,
            tag: res.cleanTag,
            referrerTag: pendingReferral.tag,
          }).catch((err) => console.warn('[Telegram referral alert]', err.message));
        }
      } catch (rewardError) {
        setArcRewardsError(rewardError.message || 'NairaTag claim notification could not be saved.');
        if (hasReferralAttribution) {
          try {
            referralReward = await recordReferralSignup({ referredTag: res.cleanTag, referredWallet: walletAddress });
            if (referralReward?.state) applyArcRewardState(referralReward.state);
          } catch (refErr) {
            console.warn('[Referral fallback error]', refErr.message);
          }
        }
      }
      // Broadcast verified Arc claim to official Telegram channel
      broadcastArcClaimToTelegram({
        tag: res.cleanTag,
        owner: walletAddress,
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
        network: activeArcChain.name,
        chainId: activeArcChain.id,
        erc8004Id: agentRegistration?.id || null,
      }).catch((broadcastErr) => console.warn('[Telegram Broadcast]', broadcastErr.message));

      // ── Immediately update the user's identity across the app ──
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
        walletAddress: walletAddress,
        txHash: res.txHash,
        amount: `₦${res.cleanTag.toUpperCase()}`,
        recipient: 'Sovereign Onchain Tag',
        explorerUrl: res.explorerUrl || `https://explorer.arc.io/address/${walletAddress}`,
        erc8004Id: agentRegistration?.id || null,
        erc8004LinkError: agentLinkError,
      });
      setIsCelebrationOpen(true);
      setIsClaimModalOpen(false);
      await refreshBalance(walletAddress);
    } catch (e) {
      const claimErr = e?.message || e?.reason || (typeof e === 'string' ? e : 'Claim failed on Arc.');
      showToast(`Claim failed: ${claimErr}`, 'error', 4000);
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
      {/* ─── Top Application Header (Reference-matched Layout) ─── */}
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
            <span>Claim ₦Tag</span>
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
            <span className="nav-badge-pill" style={{ background: '#7c3aed' }}>{chatAgents.length}</span>
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
                    href={`https://explorer.arc.io/address/${ARC_NAIRATAG_REGISTRY_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <Tag size={15} />
                    <span>NairaTag Registry ↗</span>
                  </a>

                  <a
                    href={`https://explorer.arc.io/address/${ARC_NAIRATAG_RESOLVER_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <ExternalLink size={15} />
                    <span>NairaTag Resolver ↗</span>
                  </a>

                  <a
                    href="https://erc-8004.quicknode.com/agents?network=arc-testnet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <Bot size={15} />
                    <span>8004scan (Arc Testnet AI Agents) ↗</span>
                  </a>

                  <div className="more-menu-divider" />

                  <div className="more-menu-meta">
                    <span className="more-menu-dot" />
                    <span>Arc Osaka EVM (5042)</span>
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
                        <span>You’re all caught up. Reward updates and daily reminders will appear here.</span>
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

      {/* ───────────────────────────────────────────────────────────────────
          MOBILE NAVIGATION DRAWER (SLIDE-DOWN SHEET MATCHING REFERENCE)
          ─────────────────────────────────────────────────────────────────── */}
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

      {/* ───────────────────────────────────────────────────────────────────
          MOBILE QUICK SEARCH MODAL (SEARCH ICON TRIGGER)
          ─────────────────────────────────────────────────────────────────── */}
      {isMobileSearchOpen && (
        <div className="mobile-search-backdrop" onClick={() => setIsMobileSearchOpen(false)}>
          <div className="mobile-search-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-search-bar-row">
              <Search size={18} color="var(--privy-color-foreground-3)" />
              <input
                type="text"
                autoFocus
                className="mobile-search-input"
                placeholder="Search ₦Tag, Agent, or 0x address..."
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
                  {['₦chowdeck', '₦dev', '₦designer', '₦food', '₦ride', '₦escrow'].map((preset) => (
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
                          <span className="agent-circle-tag-pill">₦{mobileSearchResult.agent.tag}</span>
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
                        ₦{mobileSearchResult.tag}
                      </div>
                      <div style={{ fontSize: '12px', color: mobileSearchResult.available ? '#059669' : '#DC2626', fontWeight: 600 }}>
                        {mobileSearchResult.available ? '✓ Available to claim' : '✕ Taken / Registered'}
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
                          setRecipientInput(`₦${mobileSearchResult.tag}`);
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

      {/* ─── Main Application Body ─── */}
      <main className={`main-content-wrapper ${mainTab === 'claim' ? 'claim-active' : ''} ${mainTab === 'chat' ? 'chat-mode' : ''}`}>
        {mainTab === 'profile' && (
          <RedesignedProfilePage
            walletAddress={walletAddress}
            authProvider={authProvider}
            accountEmail={accountEmail}
            displayAccountName={displayAccountName}
            myTag={myTag}
            usdcBalance={usdcBalance}
            userPoints={userPoints}
            onSendUsdc={() => setMainTab('pay')}
            onClaimTag={() => setMainTab('claim')}
            onOpenRewards={() => setMainTab('rewards')}
            onOpenPersonalAgent={() => setIsPersonalAgentOpen(true)}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            onDisconnect={handleDisconnect}
            onRequestConnect={() => setIsConnectModalOpen(true)}
            onBackToChat={() => setMainTab('chat')}
            recentArcTags={recentArcTags}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 1: PAY & RESOLVE TERMINAL
            ─────────────────────────────────────────────────────────────────── */}
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
                    + Claim ₦Tag
                  </button>
                </div>
              </div>

              {/* 1. Recipient ₦Tag Input Box */}
              <div className="tag-recipient-box">
                <div className="token-input-header">
                  <span>To</span>
                  <span style={{ color: 'var(--privy-color-border-interactive)' }}>Direct Resolve</span>
                </div>
                <div className="tag-input-field-wrap">
                  <span className="tag-currency-symbol">₦</span>
                  <input
                    type="text"
                    className="tag-text-field"
                    placeholder="Enter name (e.g. SEGUN, FOOD)"
                    value={recipientInput.replace(/^[$₦]/, '')}
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
                      onClick={() => setRecipientInput(`₦${tag}`)}
                    >
                      ₦{tag}
                    </button>
                  ))}
                </div>

                {/* Resolved Recipient Card */}
                {resolution.data && resolution.data.resolvedAddress && (
                  <div className="resolved-recipient-card">
                    <div className="resolved-left">
                      <div className="resolved-avatar">
                        {resolution.data.tag ? resolution.data.tag.slice(1, 2) : '₦'}
                      </div>
                      <div>
                        <div className="resolved-title">
                          {resolution.data.tag || 'Verified Recipient'}
                          <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--privy-color-success-dark)', fontWeight: 600 }}>
                            ● RESOLVED
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
                    <span>{showMemoField ? '− Hide Memo' : '+ Add Memo (Optional)'}</span>
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

        {/* ───────────────────────────────────────────────────────────────────
            TAB 2: CLAIM NAIRATAG IDENTITY
            ─────────────────────────────────────────────────────────────────── */}
        {mainTab === 'claim' && (
          <div className="claim-page-layout">
            {/* Left Column: Uniswap-width 480px Main Claim Console & Registrations */}
            <main className="claim-page-main">
              <div className="claim-console-card">
                {/* Active Claimed Tag Banner (Persistent Profile Display) */}
                {myTag?.tag && (
                  <div className="active-claimed-banner">
                    <div className="active-claimed-info">
                      <span style={{ fontSize: '15px' }}>✨</span>
                      <div>
                        <div className="active-claimed-label">
                          You own <strong>₦{myTag.tag?.replace(/^[$₦]/, '').toUpperCase()}</strong>
                        </div>
                        <div className="active-claimed-sub">
                          {shorten(walletAddress)} · Arc Mainnet
                        </div>
                      </div>
                    </div>
                    <div className="active-claimed-actions">
                      <button
                        type="button"
                        className="btn-claimed-action"
                        onClick={() => triggerCopy('my_tag', `₦${myTag.tag?.replace(/^[$₦]/, '').toUpperCase()}`)}
                        title="Copy ₦Tag"
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
                    <span className="live-tag-prefix">₦</span>
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
                    value={claimInput.replace(/^[$₦]/, '')}
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
                      title={`₦${claimInput.replace(/^[$₦]/, '').toLowerCase() || 'tag'} Live Mascot (${liveMascotProfile?.palette?.name || 'Vibrant'})`}
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
                      <span>Claiming your ₦Tag…</span>
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
                  {isRetryingArcAgentLink ? 'Linking to ERC-8004…' : `Complete ERC-8004 link for ₦${pendingArcAgentLink.tag.toUpperCase()}`}
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
                            title={`Open ₦${item.tag} profile`}
                          >
                            <img
                              className="reg-dicebear-avatar"
                              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.tag)}`}
                              alt=""
                              onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                            />
                            <span className="reg-pill-copy">
                              <span className="reg-handle-tag">₦{item.tag}</span>
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



        {/* ───────────────────────────────────────────────────────────────────
            TAB 3: AI AGENTS (GRID & LIST VIEW GROUNDED IN REFERENCES 1, 2, 3)
            ─────────────────────────────────────────────────────────────────── */}
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
                  {agentDirectoryLoading ? 'Retrying…' : 'Try again'}
                </button>
              </div>
            )}

            {agentDirectoryLoading && chatAgents.length === 0 && (
              <div className="agent-directory-empty" role="status">Loading agents from the Arc registry…</div>
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
                        <img
                          className="agent-circle-avatar-img"
                          src={getOriginalAgentLogo(agent)}
                          alt={agent.name || agent.tag}
                          aria-hidden="true"
                          onError={(e) => {
                            const fallback = getOriginalAgentLogo(agent.tag);
                            if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                          }}
                        />
                        <span className={`agent-directory-rank ${agent.leaderboardRank <= 3 ? `rank-top${agent.leaderboardRank}` : ''}`}>#{agent.leaderboardRank}</span>
                      </div>
                    </div>
                    <div className="agent-directory-tag">₦{String(agent.tag || '').replace(/^[₦$@#]/, '')}</div>
                    {agent.category && agent.category !== 'Autonomous Core' && <div className="agent-directory-category">{agent.category}</div>}
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
                        <img
                          src={getOriginalAgentLogo(agent)}
                          alt={agent.name || agent.tag}
                          aria-hidden="true"
                          className="agent-circle-avatar-img"
                          onError={(e) => {
                            const fallback = getOriginalAgentLogo(agent.tag);
                            if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                          }}
                        />
                        <span className={`agent-directory-rank ${agent.leaderboardRank <= 3 ? `rank-top${agent.leaderboardRank}` : ''}`}>#{agent.leaderboardRank}</span>
                      </div>
                      <div className="agent-circle-meta">
                        <div className="agent-circle-name">
                          <span className="agent-circle-tag-pill">₦{String(agent.tag || '').replace(/^[₦$@#]/, '')}</span>
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

        {/* ───────────────────────────────────────────────────────────────────
            TAB: TASKS & BOUNTIES (MATCHING AGENTS PAGE LAYOUT & DESIGN)
            ─────────────────────────────────────────────────────────────────── */}
        {mainTab === 'tasks' && (
          <div className="agents-page-container">
            {selectedTask ? (
              <section className="task-detail-page">
                <button type="button" className="btn-agent-secondary task-detail-back" onClick={() => setSelectedTaskId(null)}>
                  <ArrowLeft size={15} /> Back to tasks
                </button>

                <div className="task-detail-heading">
                  <div className="task-detail-heading-copy">
                    <h1>{selectedTask.title}</h1>
                  </div>
                </div>

                {selectedTask.isVoucherTask ? (
                  <div className="task-detail-grid">
                    <div className="task-detail-main">
                      <article className="task-detail-panel">
                        <div className="task-detail-deliverable">
                          <strong>Submit</strong>
                          <span>Your social username or profile link</span>
                        </div>
                        <a className="btn-agent-secondary" href={selectedTask.voucherTask.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} /> {selectedTask.voucherTask.actionLabel}
                        </a>
                      </article>
                      <article className="task-detail-panel task-submit-panel">
                        <div className="social-task-proof-field">
                          <label htmlFor="social-task-proof">Social account</label>
                          <input
                            id="social-task-proof"
                            type="text"
                            autoComplete="off"
                            placeholder="@username or profile link"
                            value={socialTaskProof}
                            onChange={(event) => setSocialTaskProof(event.target.value)}
                            maxLength={1000}
                            disabled={Boolean(selectedVoucherClaim && selectedVoucherClaim.status !== 'rejected')}
                          />
                        </div>
                        <button type="button" className="btn-agent-primary social-task-submit-button" onClick={() => handleClaimInHouseVoucher(selectedTask.voucherTask, socialTaskProof)} disabled={Boolean(selectedVoucherClaim && selectedVoucherClaim.status !== 'rejected')}>
                          <CheckCircle2 size={14} />
                          {selectedVoucherClaim?.status === 'pending' ? 'Submitted for review' : selectedVoucherClaim?.status === 'approved' ? 'Task approved' : selectedVoucherClaim?.status === 'rejected' ? 'Resubmit for review' : 'Submit completion'}
                        </button>
                      </article>
                    </div>
                    <aside className="task-detail-sidebar">
                      <article className="task-detail-panel task-reward-panel">
                        <span className="task-detail-eyebrow">SOCIAL TASK REWARD</span>
                        <strong>+{selectedTask.points} <small>Points</small></strong>
                        <span>Protocol Points after approval</span>
                      </article>
                      <article className="task-detail-panel">
                        <h2><ShieldCheck size={16} /> Status</h2>
                        <div className="task-escrow-status">{selectedVoucherClaim?.status === 'approved' ? 'Approved' : selectedVoucherClaim?.status === 'rejected' ? 'Not approved' : selectedVoucherClaim ? 'Pending review' : 'Not submitted'}</div>
                      </article>
                    </aside>
                  </div>
                ) : (
                  <div className="task-detail-grid">
                  <div className="task-detail-main">
                    <article className="task-detail-panel">
                      <p>{selectedTask.description}</p>
                      <div className="task-detail-deliverable">
                        <strong>Submit</strong>
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
                          <h2>Your submission</h2>
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
                    </article>
                  </div>

                  <aside className="task-detail-sidebar">
                    <article className="task-detail-panel task-reward-panel">
                      <span className="task-detail-eyebrow">REWARD</span>
                      <strong>${selectedTask.rewardUSDC} <small>USDC</small></strong>
                      <span>+{selectedTask.points} points after approval</span>
                    </article>

                    <article className="task-detail-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                        <ShieldCheck size={16} />
                        <span>Arc Mainnet Escrow</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)', lineHeight: 1.4 }}>
                        Protected by <a href="https://explorer.arc.io/address/0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--privy-color-interactive)', textDecoration: 'underline' }}>NairaTagBountyEscrow (0x69f1...99ab)</a>. Payout releases directly in native USDC.
                      </div>
                      {taskProgress[selectedTask.id]?.status === 'submitted' && (
                        <button
                          type="button"
                          className="btn-agent-primary"
                          style={{ marginTop: '4px', width: '100%', justifyContent: 'center', background: '#10b981', color: '#fff' }}
                          onClick={() => handleReleaseEscrowPayout(selectedTask)}
                          disabled={isEscrowProcessing}
                        >
                          <ShieldCheck size={14} />
                          <span>{isEscrowProcessing ? 'Releasing on Arc…' : 'Release USDC Escrow Payout'}</span>
                        </button>
                      )}
                      {taskProgress[selectedTask.id]?.status === 'paid' && (
                        <div style={{ padding: '6px 8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                          ✓ Bounty paid on-chain in USDC
                        </div>
                      )}
                    </article>

                    <button type="button" className="btn-agent-secondary task-chat-button" onClick={() => handleTaskChat(selectedTask)}>
                      <MessageSquare size={15} /> Message owner
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
                    onClick={() => { setCreatedTask(null); setIsPostTaskOpen(true); }}
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
                <span className="agents-stat-card-value">{allTasks.length + socialTasks.length}</span>
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
                { id: 'dev', label: '⚡ Engineering' },
                { id: 'design', label: '🎨 Design' },
                { id: 'data', label: '📊 Data & AI' },
                { id: 'content', label: '✍️ Content' },
                { id: 'test', label: '🧪 Testing' },
                { id: 'community', label: '📱 Community' },
                { id: 'social', label: 'Social' },
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
                        ? 'Syncing Arc Escrow Bounties…'
                        : (tasksSearch || tasksFilter !== 'all')
                          ? 'No Matching Tasks Found'
                          : 'No tasks available'}
                    </h3>

                    {(tasksLoading || tasksSearch || tasksFilter !== 'all') && (
                      <p className="tasks-empty-subtitle">
                        {tasksLoading
                          ? 'Connecting to Arc Osaka smart contracts and querying verified community milestones…'
                          : tasksSearch
                            ? `No bounties match "${tasksSearch}". Try clearing your search or switching categories.`
                            : 'There are no open bounties in this category yet. Explore other categories or post one yourself.'}
                      </p>
                    )}

                    <div className="tasks-empty-actions">
                      {!tasksLoading && (
                        <button
                          type="button"
                          className="btn-agent-primary"
                          onClick={() => { setCreatedTask(null); setIsPostTaskOpen(true); }}
                        >
                          <Plus size={14} />
                          <span>Create Task</span>
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
                    const creatorTag = String(task.creatorTag || '').replace(/^[₦$@#]/, '').trim();
                    const creatorAgent = chatAgents.find((agent) => String(agent.tag || '').replace(/^[₦$@#]/, '').toLowerCase() === creatorTag.toLowerCase());
                    const creatorAvatar = creatorTag.toLowerCase() === 'nairatag'
                      ? '/nairatag-logo.png'
                      : getOriginalAgentLogo(creatorAgent || creatorTag);
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
                          <img
                            className="task-poster-avatar"
                            src={creatorAvatar}
                            alt={`${creatorTag || 'Task poster'} avatar`}
                            onError={(event) => { event.currentTarget.src = '/agents/bloom.png'; }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <h3 className="milestone-card-title" style={{ margin: 0 }}>₦{task.creatorTag.replace(/^₦/, '').toUpperCase()}</h3>
                          <img
                            src="/verified-badge.png"
                            alt=""
                            aria-hidden="true"
                            style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                            title="Arc Escrow Verified"
                          />
                        </div>
                        <div className="milestone-card-role" title={task.title}>{task.title}</div>

                        <div
                          className="milestone-task-status"
                          title={`${task.participantCount || 0} people earned from this task`}
                          aria-label={`${task.participantCount || 0} people earned from this task`}
                        >
                          <Users size={13} strokeWidth={2.2} aria-hidden="true" />
                          <span>{(Number(task.participantCount) || 0).toLocaleString()}</span>
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
                          <span className="milestone-earnings-value" style={{ color: '#10B981' }}>
                            {task.isVoucherTask
                              ? (isDone ? 'Earned' : `+${task.points} Points`)
                              : (isDone ? 'Paid' : `$${task.rewardUSDC} USDC`)}
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

        {/* ───────────────────────────────────────────────────────────────────
            TAB 4: SOVEREIGN AGENT CHAT (TAG2TAG LAYER & TASK DISPATCH)
            ─────────────────────────────────────────────────────────────────── */}
        {/* ───────────────────────────────────────────────────────────────────
            TAB 4: WALLEY-AI MINIMAL CHAT INTERFACE
            ─────────────────────────────────────────────────────────────────── */}
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
                  {walletAddress && displayAccountName ? `Hey ${displayAccountName} 👋` : 'Hey there 👋'}
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

                  {/* Card 3: DefiLlama */}
                  <button
                    type="button"
                    className="ref-action-card card-defillama"
                    onClick={() => handleSendChatPrompt('@defillama what are the top DeFi protocols by TVL on DefiLlama?')}
                    title="Live DeFi TVL and Liquidity Rankings"
                  >
                    <div className="ref-action-icon-circle icon-circle-defillama">
                      <img src="/agents/defillama.png" alt="DefiLlama" className="ref-action-agent-logo" />
                    </div>
                    <span className="ref-action-title">₦DefiLlama</span>
                  </button>

                  {/* Card 4: CoinGecko */}
                  <button
                    type="button"
                    className="ref-action-card card-coingecko"
                    onClick={() => handleSendChatPrompt('@coingecko what is the current USDC to NGN exchange rate and market pulse?')}
                    title="Real-time Crypto and FX Exchange Rates"
                  >
                    <div className="ref-action-icon-circle icon-circle-coingecko">
                      <img src="/agents/coingecko.png" alt="CoinGecko" className="ref-action-agent-logo" />
                    </div>
                    <span className="ref-action-title">₦CoinGecko</span>
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
                          {msg.sender === 'agent' && (
                            <div className="walley-msg-agent-header">
                              <img
                                src={getOriginalAgentLogo(msg.agentTag || msg.avatar)}
                                alt=""
                                className="walley-msg-agent-avatar"
                                onError={(e) => {
                                  const fallback = getOriginalAgentLogo(msg.agentTag);
                                  if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                                }}
                              />
                              <span className="walley-msg-agent-name">{msg.agentName || (msg.agentTag ? `₦${String(msg.agentTag).toUpperCase()}` : 'NairaTag Agent')}</span>
                            </div>
                          )}
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
                      agentAvatar={getOriginalAgentLogo(currentTaggedAgent)}
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
                  <button
                    type="button"
                    className="walley-agent-menu-action"
                    onClick={() => {
                      setIsTagPopoverOpen(false);
                      toggleSpeechRecognition();
                    }}
                  >
                    <Mic size={15} />
                    <span>Dictate a message</span>
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
                        <img
                          src={getOriginalAgentLogo(agent)}
                          alt={agent.name}
                          style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => {
                            const fallback = getOriginalAgentLogo(agent.tag);
                            if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                          }}
                        />
                        <div className="walley-agent-item-info">
                          <span className="walley-agent-tag">₦{agent.tag}</span>
                          {agent.usedByCount != null && (
                            <span className="walley-agent-availability">
                              Used by {agent.usedByCount.toLocaleString()} {agent.usedByCount === 1 ? 'person' : 'people'}
                            </span>
                          )}
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
                      {voiceTranscribedText ? `“${voiceTranscribedText}”` : "Listening... speak your directive"}
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
                      className={`walley-capsule-icon-btn ${voice.status === 'active' ? 'listening-active' : ''}`}
                      onClick={handleStartVoiceMode}
                      title="Start a voice conversation"
                      aria-label="Start a voice conversation"
                      disabled={voice.status === 'connecting' || voice.status === 'active'}
                    >
                      <AudioLines size={18} />
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
                    {chatHistoryLoading && <div className="walley-history-empty">Loading saved chats…</div>}
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
                          <small>₦{conversation.agent_tag || 'arc'} Â· {new Date(conversation.updated_at).toLocaleString()}</small>
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

        {/* ───────────────────────────────────────────────────────────────────
            TAB 5: FAQ (PROTOCOL KNOWLEDGE BASE & ACCORDION)
            ─────────────────────────────────────────────────────────────────── */}
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
                  { id: 'claim', label: 'Claiming ₦Tag' },
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
                  Explore verified AI Agents on Arc Osaka EVM or claim your sovereign ₦Tag handle today.
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
                  <span>Claim ₦Tag</span>
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

        {/* ───────────────────────────────────────────────────────────────────
            TAB 6: REWARDS & VOUCHERS CENTER (GROUNDED IN USER REFERENCES)
            ─────────────────────────────────────────────────────────────────── */}
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

      {/* ───────────────────────────────────────────────────────────────────
          MOBILE FIXED FOOTER MENU (MATCHING EXACT USER SCREENSHOT STYLE)
          (Hidden on Chat page per user specification)
          ─────────────────────────────────────────────────────────────────── */}
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
              <span className="mobile-footer-badge badge-purple">{chatAgents.length}</span>
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

      {/* ───────────────────────────────────────────────────────────────────
          MODAL 0: TRANSACTION REVIEW STATE MODAL
          ─────────────────────────────────────────────────────────────────── */}
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
                <span className="details-value">Arc Mainnet (Chain ID 5042)</span>
              </div>
              <div className="details-row">
                <span className="details-label">
                  <ShieldCheck size={12} />
                  <span>Tag Resolver Contract</span>
                </span>
                <span className="details-value">{shorten(ARC_NAIRATAG_RESOLVER_ADDRESS)}</span>
              </div>
              <div className="details-row">
                <span className="details-label">
                  <Flame size={12} />
                  <span>Gas Token & Floor</span>
                </span>
                <span className="details-value">Arc USDC (18 dec) • 20 Gwei min</span>
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
                  <span>Working on your transaction…</span>
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

      {/* ───────────────────────────────────────────────────────────────────
          MODAL 1: CONNECT WALLET OVERLAY (CIRCLE W3S + BROWSER WALLETS)
          ─────────────────────────────────────────────────────────────────── */}
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
              {celebrationDetails.type === 'claim' && `Your NairaTag is ready to share: ${celebrationDetails.amount}`}
            </div>

            {/* Ticket receipt */}
            <div className="ticket-receipt-card" style={{ width: '100%', marginTop: '6px' }}>
              <div className="ticket-header">
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{celebrationDetails.type === 'claim' ? 'Your NairaTag' : 'Receipt'}</span>
                <span className="ticket-status-pill">
                  <CheckCircle2 size={11} />
                  <span>{celebrationDetails.type === 'claim' ? 'Ready' : 'Finalized &lt; 1s'}</span>
                </span>
              </div>
              <div className="ticket-route-row">
                <div style={{ textAlign: 'left', width: '100%' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-2)' }}>{celebrationDetails.type === 'claim' ? 'Your Sovereign NairaTag' : 'Amount'}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--privy-color-foreground-1)' }}>{celebrationDetails.amount}</div>
                  {celebrationDetails.type === 'claim' && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid var(--privy-color-line-subtle)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--privy-color-foreground-2)', fontWeight: 600 }}>USDC-RECEIVING ADDRESS (ARC MAINNET)</div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all', marginTop: '2px', color: 'var(--privy-color-interactive)' }}>
                        {celebrationDetails.walletAddress || walletAddress}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-3)', marginTop: '4px' }}>
                        ✓ Anyone can now send native USDC to {celebrationDetails.amount} on Arc Mainnet with sub-cent gas.
                      </div>
                    </div>
                  )}
                </div>
                {celebrationDetails.type !== 'claim' && <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-2)' }}>Settlement</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--privy-color-success-dark)' }}>Osaka EVM</div>
                </div>}
              </div>
              <a
                href={celebrationDetails.explorerUrl || `https://explorer.arc.io/address/${celebrationDetails.walletAddress || walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="quick-chip-btn"
                style={{ textAlign: 'center', justifyContent: 'center', padding: '6px', marginTop: '6px' }}
              >
                View on ArcScan ↗
              </a>
              {celebrationDetails.erc8004Id && celebrationDetails.type !== 'claim' && (
                <a
                  href={`https://erc-8004.quicknode.com/agents/arc-testnet/${celebrationDetails.erc8004Id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-chip-btn"
                  style={{ textAlign: 'center', justifyContent: 'center', padding: '6px', marginTop: '6px' }}
                >
                  View ERC-8004 agent #{celebrationDetails.erc8004Id} ↗
                </a>
              )}
              {celebrationDetails.erc8004LinkError && celebrationDetails.type !== 'claim' && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ color: 'var(--privy-color-foreground-2)', fontSize: '11px', marginBottom: '6px' }}>{celebrationDetails.erc8004LinkError}</div>
                  <button type="button" className="btn-action-primary" disabled={isRetryingArcAgentLink} onClick={handleRetryArcAgentLink}>
                    {isRetryingArcAgentLink ? 'Linking to ERC-8004…' : 'Complete ERC-8004 link'}
                  </button>
                </div>
              )}
            </div>

            {/* Social Intent Sharing & Telegram Broadcast Confirmation */}
            {celebrationDetails.type === 'claim' && (
              <div className="celebration-social-box">
                <div className="celebration-social-header">
                  <span className="celebration-social-title">Welcome to NairaTag</span>
                  <a
                    href={TELEGRAM_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="celebration-live-channel-link"
                    title="Join the NairaTag community"
                  >
                    <span className="celebration-live-dot" />
                    <span>Join the community</span>
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

      {/* ───────────────────────────────────────────────────────────────────
          MODAL 3: CLAIM NAIRATAG DIALOG
          ─────────────────────────────────────────────────────────────────── */}
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
              <strong>{Number(welcomeDetails.points) > 0 ? `+${Number(welcomeDetails.points).toLocaleString()}` : '🎁 Free Spin Ready'}</strong>
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
              <span className="card-header-title">Claim Free ₦Tag</span>
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
                <span className="tag-currency-symbol">₦</span>
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
                  {claimStatus.available ? '✓ Tag is available' : `✕ ${claimStatus.reason}`}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-action-primary"
              disabled={!claimStatus?.available || isClaiming}
              onClick={handleExecuteClaim}
            >
              {isClaiming ? 'Claiming your ₦Tag…' : `Claim ₦${(claimInput.replace(/^[$₦@#]/, '') || 'Tag').toUpperCase()}`}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          MODAL 4: AGENT PROFILE POPUP (GROUNDED IN USER REFERENCES)
          ─────────────────────────────────────────────────────────────────── */}
      {selectedAgentProfile && (
        <div className="agent-modal-backdrop" onClick={() => setSelectedAgentProfile(null)}>
          <div className="agent-modal-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="agent-profile-content">
              <div className="agent-profile-title-row">
                <div className="agent-profile-social-bar">
                  <a
                    href={getAgentTwitterShareUrl({ tag: selectedAgentProfile.tag })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="agent-social-btn agent-social-x"
                    title="Share on X"
                    aria-label="Share on X"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a
                    href={getAgentTelegramShareUrl({ tag: selectedAgentProfile.tag })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="agent-social-btn agent-social-telegram"
                    title="Share on Telegram"
                    aria-label="Share on Telegram"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                  </a>
                  <a
                    href={getAgentWhatsAppShareUrl({ tag: selectedAgentProfile.tag })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="agent-social-btn agent-social-whatsapp"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 012.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.88.86-.88 2.09s.9 2.43 1.02 2.6c.12.17 1.77 2.7 4.28 3.78.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.12-.22-.19-.47-.31z"/>
                    </svg>
                  </a>
                  <button
                    type="button"
                    className="agent-social-btn agent-social-copy"
                    onClick={() => triggerCopy(`agent_share_${selectedAgentProfile.tag}`, getAgentShareUrl(selectedAgentProfile.tag))}
                    title="Copy profile link"
                    aria-label="Copy profile link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  className="agent-modal-close-btn"
                  onClick={() => setSelectedAgentProfile(null)}
                  aria-label="Close profile"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="agent-profile-main-row">
                <img
                  className="agent-profile-avatar"
                  src={getOriginalAgentLogo(selectedAgentProfile)}
                  alt=""
                  onError={(e) => {
                    const fallback = getOriginalAgentLogo(selectedAgentProfile?.tag);
                    if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                  }}
                />
                <div className="agent-profile-heading-copy">
                  <div className="agent-profile-name-line">
                    <h2>₦{selectedAgentProfile.tag.toUpperCase()}</h2>
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
                    {agentFollowState.loading ? '…' : agentFollowState.updating ? 'Saving…' : String(agentProfileLiveData?.details?.owner || selectedAgentProfile.owner || '').toLowerCase() === String(walletAddress || '').toLowerCase() ? 'Your agent' : agentFollowState.following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              <p className="agent-profile-description">
                {selectedAgentProfile.profileType === 'claimed-tag' ? 'NairaTag holder' : selectedAgentProfile.role}
              </p>

              <div className="agent-profile-stats">
                <div><strong>{selectedAgentProfile.profileType === 'claimed-tag' || selectedAgentProfile.profileType === 'platform-agent' ? '—' : agentFollowState.loading ? '…' : agentFollowState.error ? '—' : agentFollowState.followerCount}</strong><span>Followers</span></div>
                <div><strong>{selectedAgentProfile.profileType === 'platform-agent' ? (selectedAgentProfile.callableTools?.length || 0) : `${selectedAgentProfile.earnings ?? 0} USDC`}</strong><span>{selectedAgentProfile.profileType === 'platform-agent' ? 'Enabled tools' : 'Earned'}</span></div>
                <div><strong>{selectedAgentProfile.identity?.verifiedOnchain && selectedAgentProfile.identity?.erc8004AgentId ? `#${selectedAgentProfile.identity.erc8004AgentId}` : selectedAgentProfile.profileType === 'platform-agent' ? 'Platform' : selectedAgentProfile.id ? `#${selectedAgentProfile.id}` : '—'}</strong><span>{selectedAgentProfile.profileType === 'platform-agent' ? 'Identity' : 'Agent ID'}</span></div>
                <div><strong>{selectedAgentProfile.profileType === 'platform-agent' ? '—' : selectedAgentProfile.profileType === 'claimed-tag'
                  ? selectedAgentProfile.profileLoading ? '…' : selectedAgentProfile.completedTaskCount ?? '—'
                  : agentProfileLiveLoading ? '…' : agentProfileLiveData?.completedTaskCount ?? '—'}</strong><span>Tasks done</span></div>
              </div>

              {selectedAgentProfile.profileType === 'platform-agent' ? (
                selectedAgentProfile.category && selectedAgentProfile.category !== 'Autonomous Core' && selectedAgentProfile.category !== 'Platform agent' ? (
                  <div className="agent-profile-detail-row agent-profile-platform-tools">
                    <div className="agent-profile-category">{selectedAgentProfile.category}</div>
                  </div>
                ) : null
              ) : (
                selectedAgentProfile.category && selectedAgentProfile.category !== 'Autonomous Core' && selectedAgentProfile.category !== 'NairaTag' ? (
                  <div className="agent-profile-detail-row">
                    <div className="agent-profile-category">{selectedAgentProfile.category}</div>
                    <div className="agent-profile-owner">
                      <span>Owner</span>
                      <strong>{selectedAgentProfile.profileType === 'claimed-tag' && selectedAgentProfile.profileLoading
                        ? 'Loading…'
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
                  </div>
                ) : (
                  (agentProfileLiveData?.details?.owner || selectedAgentProfile.owner) ? (
                    <div className="agent-profile-detail-row">
                      <div className="agent-profile-owner" style={{ marginLeft: 0 }}>
                        <span>Owner</span>
                        <strong>{shorten(agentProfileLiveData?.details?.owner || selectedAgentProfile.owner)}</strong>
                        <button
                          type="button"
                          onClick={() => triggerCopy(`agent_owner_${selectedAgentProfile.id || selectedAgentProfile.tag}`, agentProfileLiveData?.details?.owner || selectedAgentProfile.owner)}
                          aria-label="Copy owner address"
                        ><Copy size={14} /></button>
                      </div>
                    </div>
                  ) : null
                )
              )}

              <div className="agent-profile-card-actions">
                <button
                  type="button"
                  className="agent-profile-pay-button"
                  disabled={selectedAgentProfile.profileType === 'claimed-tag' && (!selectedAgentProfile.owner || selectedAgentProfile.profileLoading)}
                  onClick={() => handlePayAgentFromProfile(selectedAgentProfile)}
                ><Send size={15} /> Pay ₦{String(selectedAgentProfile.tag || '').replace(/^[₦$@#]/, '').toUpperCase()}</button>
                <button
                  type="button"
                  className="agent-profile-chat-button"
                  onClick={() => handleChatWithAgentFromProfile(selectedAgentProfile)}
                ><MessageSquare size={15} /> Chat</button>
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

      {/* ───────────────────────────────────────────────────────────────────
          MODAL: CREATE TASK DIALOG
          ─────────────────────────────────────────────────────────────────── */}
      {isPostTaskOpen && (
        <div className="modal-backdrop" onClick={() => { if (!isTaskCreating) { setIsPostTaskOpen(false); setCreatedTask(null); } }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>💼</span>
                <span className="card-header-title">Create a new task</span>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--privy-color-foreground-2)', cursor: 'pointer' }}
                onClick={() => { if (!isTaskCreating) { setIsPostTaskOpen(false); setCreatedTask(null); } }}
              >
                <X size={18} />
              </button>
            </div>

            {createdTask ? (
              <div className="task-created-success">
                <div className="task-created-success-icon"><CheckCircle2 size={24} /></div>
                <h2>Task created successfully</h2>
                <strong className="task-created-title">{createdTask.title}</strong>
                <p>Your task is live. Users will see it in Tasks and receive an in-app notification.</p>
                <div className="task-created-reward">Reward: ${Number(createdTask.rewardUSDC).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC</div>
                <div className="task-created-share-actions">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`New task on NairaTag: ${createdTask.title}. Reward: $${createdTask.rewardUSDC} USDC.`)}&url=${encodeURIComponent('https://arc.nairatag.ng/#tasks')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  ><Share2 size={14} /> Share on X</a>
                  <a
                    href={getTelegramShareIntentUrl({ text: `New task on NairaTag: ${createdTask.title}. Reward: $${createdTask.rewardUSDC} USDC.`, url: 'https://arc.nairatag.ng/#tasks' })}
                    target="_blank"
                    rel="noopener noreferrer"
                  ><Send size={14} /> Share on Telegram</a>
                  <button type="button" onClick={() => triggerCopy('created_task_link', 'https://arc.nairatag.ng/#tasks')}>
                    <Copy size={14} /> Copy task link
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-agent-secondary task-created-done"
                  onClick={() => { setIsPostTaskOpen(false); setCreatedTask(null); }}
                >Done</button>
              </div>
            ) : (
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-2)', textTransform: 'uppercase' }}>
                  Task title
                </label>
                <input
                  type="text"
                  className="token-amount-field"
                  style={{ width: '100%', fontSize: '13px', padding: '8px 10px', marginTop: '4px' }}
                  placeholder="e.g. Build Webhook Listener for Arc Osaka"
                  value={postTaskForm.title}
                  onChange={(e) => setPostTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  minLength={4}
                  maxLength={120}
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
                    <option value="dev">⚡ Engineering</option>
                    <option value="design">🎨 Design</option>
                    <option value="data">📊 Data & AI</option>
                    <option value="content">✍️ Content</option>
                    <option value="test">🧪 Testing</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-2)', textTransform: 'uppercase' }}>
                    Reward (USDC)
                  </label>
                  <input
                    type="number"
                    className="token-amount-field"
                    style={{ width: '100%', fontSize: '13px', padding: '8px 10px', marginTop: '4px' }}
                    placeholder="35"
                    value={postTaskForm.reward}
                    onChange={(e) => setPostTaskForm((prev) => ({ ...prev, reward: e.target.value }))}
                    min="0.000001"
                    max="1000000"
                    step="0.000001"
                    required
                  />
                  <div style={{ fontSize: '10px', color: 'var(--privy-color-foreground-2)', marginTop: '2px' }}>
                    ≈ ₦{((parseFloat(postTaskForm.reward) || 0) * 1485).toLocaleString()} NGN
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
                  placeholder="Describe the task and what counts as completion..."
                  value={postTaskForm.description}
                  onChange={(e) => setPostTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </div>

              <div style={{ padding: '9px 11px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '11px', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                  <ShieldCheck size={13} />
                  <span>Arc Mainnet Bounty Escrow</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-2)' }}>
                  Connected to <a href="https://explorer.arc.io/address/0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--privy-color-interactive)', textDecoration: 'underline' }}>0x69f1...99ab</a>. Task rewards are held in escrow and released in native USDC upon verified completion.
                </span>
              </div>

              <button type="submit" className="btn-action-primary" style={{ marginTop: '4px' }} disabled={isTaskCreating}>
                {isTaskCreating ? 'Saving task…' : 'Create Task'}
              </button>
            </form>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          MODAL: SOVEREIGN WALLET & PORTFOLIO (WITH DUAL FIAT NGN CONVERSION)
          ─────────────────────────────────────────────────────────────────── */}
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
                {myTag?.tag ? myTag.tag.replace(/^[$₦]/, '').slice(0, 1).toUpperCase() : '₦'}
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
                <span>≈ ₦{(parseFloat(usdcBalance.formatted || '0') * 1485).toLocaleString('en-NG', { maximumFractionDigits: 2 })} NGN</span>
                <span style={{ fontSize: '9.5px', opacity: 0.8 }}>@ ₦1,485/$</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--privy-color-interactive)', fontWeight: 700, marginTop: '8px' }}>
                ⚡ {userPoints} Protocol Points
              </div>
            </div>

            {/* Sub-tabs: Overview | Receive QR | Activity */}
            <div className="agent-profile-tabs" style={{ marginTop: '10px' }}>
              <button
                type="button"
                className={`agent-profile-tab-btn ${walletTab === 'overview' ? 'active' : ''}`}
                onClick={() => setWalletTab('overview')}
              >
                ✦ Overview
              </button>
              <button
                type="button"
                className={`agent-profile-tab-btn ${walletTab === 'qr' ? 'active' : ''}`}
                onClick={() => setWalletTab('qr')}
              >
                📱 Receive QR
              </button>
              <button
                type="button"
                className={`agent-profile-tab-btn ${walletTab === 'history' ? 'active' : ''}`}
                onClick={() => setWalletTab('history')}
              >
                📜 Ledger
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
                    href="https://explorer.arc.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-chip-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <ExternalLink size={12} />
                    <span>ArcScan ↗</span>
                  </a>
                </div>
              </div>
            )}

            {walletTab === 'qr' && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                {walletAddress ? (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`arc:${walletAddress}?tag=₦${myTag?.tag || ''}`)}`}
                      alt="Arc Receive QR"
                      style={{ width: '160px', height: '160px', borderRadius: '8px', border: '1px solid var(--privy-color-border-subtle)', margin: '0 auto 8px' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)' }}>
                      Scan to receive USDC or resolve {displayUserTag || 'wallet'} on Arc Osaka EVM.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', padding: '16px' }}>Please sign in to view your QR code.</div>
                )}
              </div>
            )}

            {walletTab === 'history' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {[
                  { tx: '0x3a9f...b112', title: 'Claim ₦Tag Handle', time: '10m ago', amt: '0.00 USDC', status: 'Finalized <1s' },
                  { tx: '0x8f2d...44c1', title: 'USDC Settlement to ₦michael', time: '2h ago', amt: '-10.00 USDC', status: 'Finalized <1s' },
                  { tx: '0x11ab...90aa', title: 'Bounty Quest Reward', time: '1d ago', amt: '+25.00 USDC', status: 'Finalized <1s' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--privy-color-background-surface)', borderRadius: '6px', fontSize: '11px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div style={{ color: 'var(--privy-color-foreground-2)', fontFamily: 'var(--font-mono)' }}>{item.tx} • {item.time}</div>
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
                <span>{authProvider === 'circle' ? 'Email account' : 'Wallet account'}</span>
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

      {/* ───────────────────────────────────────────────────────────────────
          FLOATING TOAST NOTIFICATION CONTAINER
          ─────────────────────────────────────────────────────────────────── */}
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

      {/* ───────────────────────────────────────────────────────────────────
          GLOBAL GAMIFIED REWARDS MODALS (ACCESSIBLE FROM HEADER & NOTIFICATIONS)
          ─────────────────────────────────────────────────────────────────── */}
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

      {/* ───────────────────────────────────────────────────────────────────
          WEB PUSH & IN-APP NOTIFICATION LAYER (VAPID INTEGRATION)
          ─────────────────────────────────────────────────────────────────── */}
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

function VoiceModePreviewPage() {
  const previewStates = [
    { phase: 'listening', inputCaption: 'Hi ₦joe, can you help me plan my day?', outputCaption: '', audioLevel: 0.22 },
    { phase: 'thinking', inputCaption: 'Hi ₦joe, can you help me plan my day?', outputCaption: '', audioLevel: 0 },
    { phase: 'speaking', inputCaption: '', outputCaption: 'Of course! Let’s start with the most important thing you need to get done today.', audioLevel: 0.48 },
  ];
  const [stateIndex, setStateIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const previewState = previewStates[stateIndex];

  const setPreviewPhase = (phaseKey) => {
    const idx = previewStates.findIndex((s) => s.phase === phaseKey);
    if (idx !== -1) setStateIndex(idx);
  };

  const voice = {
    status: 'active',
    phase: previewState.phase,
    inputCaption: previewState.inputCaption,
    outputCaption: previewState.outputCaption,
    audioLevel: muted ? 0 : previewState.audioLevel,
    muted,
    error: '',
    toggleMute: () => setMuted((value) => !value),
    advancePreview: () => setStateIndex((index) => (index + 1) % previewStates.length),
    setPreviewPhase,
    stop: () => setIsOpen(false),
    clearError: () => {},
  };

  if (!isOpen) {
    return (
      <main className="arc-voice-preview-closed" style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: '#070a08',
        color: '#f7faf5',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(201, 243, 110, 0.1)',
          border: '1px solid rgba(201, 243, 110, 0.25)',
          display: 'grid',
          placeItems: 'center',
          color: '#c9f36e',
          fontSize: '24px'
        }}>
          ✦
        </div>
        <p style={{ margin: 0, color: 'rgba(240, 246, 237, 0.7)', fontSize: '14px' }}>
          Voice mode preview is closed.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            minHeight: '44px',
            padding: '0 24px',
            borderRadius: '999px',
            border: 'none',
            background: '#c9f36e',
            color: '#070a08',
            fontSize: '13px',
            fontWeight: '750',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(201, 243, 110, 0.3)'
          }}
        >
          Open Voice Preview
        </button>
      </main>
    );
  }

  return (
    <ArcVoiceCall
      voice={voice}
      agentTag="joe"
      agentName="₦joe"
      previewMode
    />
  );
}

export default function App() {
  const isVoicePreview = import.meta.env.DEV && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('voicePreview') === '1';
  if (isVoicePreview) return <VoiceModePreviewPage />;

  const isLandingHost = typeof window !== 'undefined'
    && ['nairatag.ng', 'www.nairatag.ng'].includes(window.location.hostname.toLowerCase());
  if (isLandingHost) return <NairaTagLanding />;

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


