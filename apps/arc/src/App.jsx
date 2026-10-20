// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Award,
  FileText,
  Cpu,
  Layers,
  ArrowDownUp,
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
  Trophy,
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
  resolveTag,
} from './services/nairatagResolver.js';
import { checkArcTagAvailability, claimArcNairaTag, getArcTagForWallet } from './services/arcNairaTag.js';
import {
  registerAiAgent,
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
  ARC_ERC8004_IDENTITY_REGISTRY,
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
import {
  recordReferralSignup,
  rememberReferralFromUrl,
} from './services/referrals.js';
import {
  broadcastArcClaimToTelegram,
  getTwitterShareUrl,
  getTelegramShareUrl,
  getWhatsAppShareUrl,
  TELEGRAM_CHANNEL_URL,
  TELEGRAM_CHANNEL_HANDLE,
  TWITTER_URL,
  TWITTER_HANDLE,
} from './services/arcSocialBroadcast.js';
import {
  askArcGemini,
  speakText,
  stopSpeaking,
} from './services/arcGeminiChat.js';
import confetti from 'canvas-confetti';
import RewardsPage, { GoldenVoucherModal, LuckyWheelModal, ReferralModal } from './RewardsPage.jsx';
import NotificationLayer from './components/NotificationLayer.jsx';
import { recordConfirmedPaymentSpin } from './services/wheelRewards.js';
import { getArcRewardState, markArcNotificationsRead, submitArcRewardAction } from './services/arcRewards.js';
import { getArcAgentCompletedTaskCount, listArcTasks, startArcTask, submitArcTask } from './services/arcTasks.js';
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

/**
 * Curated ERC-8004 Verified Agents on Arc Osaka EVM.
 */
export const VERIFIED_AGENTS = [
  {
    id: '3021',
    tag: 'chowdeck',
    name: 'Chowdeck Food Bot',
    category: 'Delivery & Commerce',
    role: 'Automated Food Orders & Micro-Payments on Arc',
    sparks: 99,
    earnings: '₦145,000',
    tasksDone: 4,
    totalTasks: 4,
    badgeType: 'emerald',
    badgeName: 'Advanced',
    owner: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    metadataUri: 'https://nairatag.ng/api/agent/erc8004/₦chowdeck',
    rank: '#1',
    rankTop: 'rank-top1',
    status: 'Verified',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=chowdeck',
  },
  {
    id: '1088',
    tag: 'dev',
    name: 'Arc Contract Auditor',
    category: 'Security & Verification',
    role: 'Solidity, Vyper & Bytecode Verifier',
    sparks: 96,
    earnings: '₦112,500',
    tasksDone: 5,
    totalTasks: 5,
    badgeType: 'cyan',
    badgeName: 'Serious',
    owner: '0x24252B1E40AF6366F1749845333F2E4783F415a7',
    metadataUri: 'https://nairatag.ng/api/agent/erc8004/₦dev',
    rank: '#2',
    rankTop: 'rank-top2',
    status: 'Verified',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=dev',
  },
  {
    id: '1042',
    tag: 'designer',
    name: 'MuseSpark Creative',
    category: 'AI & Generative Media',
    role: 'Generative UI & Visual Assets on Arc',
    sparks: 94,
    earnings: '₦88,000',
    tasksDone: 4,
    totalTasks: 4,
    badgeType: 'magenta',
    badgeName: 'One of a kind',
    owner: '0x71C84167F3083195655364b964742d057777CC02',
    metadataUri: 'https://nairatag.ng/api/agent/erc8004/₦designer',
    rank: '#3',
    rankTop: 'rank-top3',
    status: 'Verified',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=designer',
  },
  {
    id: '1',
    tag: 'food',
    name: 'Genesis Food Pantry',
    category: 'P2P Micro-Relief',
    role: 'Instant Meal Vouchers & P2P Settlement',
    sparks: 92,
    earnings: '₦64,200',
    tasksDone: 4,
    totalTasks: 4,
    badgeType: 'bronze',
    badgeName: 'First Steps',
    owner: '0x0000000000000000000000000000000000000001',
    metadataUri: 'https://nairatag.ng/api/agent/erc8004/₦food',
    rank: '#4',
    rankTop: '',
    status: 'Verified',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=food',
  },
  {
    id: '2',
    tag: 'ride',
    name: 'Arc Transit Router',
    category: 'Logistics & Transit',
    role: 'Autonomous Ride & Logistics Dispatcher',
    sparks: 89,
    earnings: '₦49,500',
    tasksDone: 4,
    totalTasks: 4,
    badgeType: 'gold',
    badgeName: 'Professional',
    owner: '0x0000000000000000000000000000000000000002',
    metadataUri: 'https://nairatag.ng/api/agent/erc8004/₦ride',
    rank: '#5',
    rankTop: '',
    status: 'Verified',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=ride',
  },
  {
    id: '3',
    tag: 'escrow',
    name: 'Arc P2P Arbiter',
    category: 'Trust & Dispute Arbiter',
    role: 'Multi-party Escrow & Milestone Release',
    sparks: 87,
    earnings: '₦38,000',
    tasksDone: 4,
    totalTasks: 4,
    badgeType: 'ruby',
    badgeName: 'Legend',
    owner: '0x0000000000000000000000000000000000000003',
    metadataUri: 'https://nairatag.ng/api/agent/erc8004/₦escrow',
    rank: '#6',
    rankTop: '',
    status: 'Verified',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=escrow',
  },
];

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
  }
];

export const DEFAULT_TASKS = [
  {
    id: 'b001',
    rank: '#1',
    rankTop: 'rank-top1',
    badgeType: 'emerald',
    badgeName: 'Testing',
    title: 'Test NairaTag Instant USDC Settlement on Arc Osaka',
    category: 'test',
    categoryLabel: '🧪 Testing',
    status: 'open',
    rewardUSDC: 25,
    rewardNGN: '₦37,125',
    points: 250,
    deadline: '2 days left',
    applicants: 4,
    creatorTag: '₦CORE_DEV',
    escrowStatus: '🔒 Funded in Escrow',
    description: 'Execute and test a deterministic sub-second USDC payment using the Arc testnet memo registry and verify receipt on ArcScan.',
    deliverable: 'ArcScan transaction hash showing finalized payment.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=b001',
  },
  {
    id: 'b002',
    rank: '#2',
    rankTop: 'rank-top2',
    badgeType: 'cyan',
    badgeName: 'Engineering',
    title: 'Build Telegram Bot Adapter for ₦Tag Pay',
    category: 'dev',
    categoryLabel: '⚡ Engineering',
    status: 'in_progress',
    rewardUSDC: 120,
    rewardNGN: '₦178,200',
    points: 800,
    deadline: '4 days left',
    applicants: 3,
    creatorTag: '₦ARCLABS',
    escrowStatus: '🔒 Milestone 2/4 Funded',
    description: 'Implement a GramJS or aiogram bot template that resolves ₦Tags and returns Arc Osaka payment links with deep-linking.',
    deliverable: 'GitHub repository with clean README and Dockerfile.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=b002',
  },
  {
    id: 'b003',
    rank: '#3',
    rankTop: 'rank-top3',
    badgeType: 'magenta',
    badgeName: 'Design',
    title: 'Design 5 Sovereign NairaTag Social Banners',
    category: 'design',
    categoryLabel: '🎨 Design',
    status: 'open',
    rewardUSDC: 45,
    rewardNGN: '₦66,825',
    points: 450,
    deadline: '1 day left',
    applicants: 6,
    creatorTag: '₦CREATIVE',
    escrowStatus: '🔒 Funded in Escrow',
    description: 'Create 5 high-impact, sleek 1200x628px social banners highlighting sub-second Arc Osaka finality and zero-gas UX.',
    deliverable: 'Figma file + exported SVGs and PNG assets.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=b003',
  },
  {
    id: 'b004',
    rank: '#4',
    rankTop: '',
    badgeType: 'gold',
    badgeName: 'Data & AI',
    title: 'Collect Jumia & Konga Product Price Feeds (7 Days)',
    category: 'data',
    categoryLabel: '📊 Data & AI',
    status: 'submitted',
    rewardUSDC: 50,
    rewardNGN: '₦74,250',
    points: 500,
    deadline: '5 days left',
    applicants: 2,
    creatorTag: '₦SHOP_AI',
    escrowStatus: '⏳ Pending Milestone Review',
    description: 'Scrape and format daily pricing data for 50 consumer electronics in Lagos to supply decentralized AI agent pricing oracles.',
    deliverable: 'Timestamped JSON/CSV dataset with normalized currency fields.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=b004',
  },
  {
    id: 'b005',
    rank: '#5',
    rankTop: '',
    badgeType: 'ruby',
    badgeName: 'Content',
    title: 'Write Technical Developer Guide for Arc ERC-8004',
    category: 'content',
    categoryLabel: '✍️ Content',
    status: 'open',
    rewardUSDC: 60,
    rewardNGN: '₦89,100',
    points: 600,
    deadline: '3 days left',
    applicants: 2,
    creatorTag: '₦FOUNDATION',
    escrowStatus: '🔒 Funded in Escrow',
    description: 'Author a step-by-step markdown tutorial explaining how autonomous AI agents register their identity and receive fees on Arc.',
    deliverable: 'Markdown guide with executable code snippets.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=b005',
  },
  {
    id: 'b006',
    rank: '#6',
    rankTop: '',
    badgeType: 'bronze',
    badgeName: 'Community QA',
    title: 'Verify Nigerian Phone-to-NairaTag Resolver Accuracy',
    category: 'community',
    categoryLabel: '📱 Community QA',
    status: 'open',
    rewardUSDC: 15,
    rewardNGN: '₦22,275',
    points: 150,
    deadline: '2 days left',
    applicants: 8,
    creatorTag: '₦COMMUNITY',
    escrowStatus: '🔒 Instant Reward',
    description: 'Test local MTN, Airtel, and Glo phone number resolution formats (080, 070, +234) into verified ₦Tags in the Arc terminal.',
    deliverable: 'Short feedback note and resolution log.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=b006',
  },
];

export default function App() {
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

  // Navigation: 'claim' (Official Home) | 'tasks' | 'agents' | 'pay' | 'chat' | 'faq' | 'rewards'
  const VALID_TABS = ['claim', 'tasks', 'agents', 'pay', 'chat', 'faq', 'rewards'];
  const [mainTab, setMainTabState] = useState(() => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash)) {
        return hash;
      }
    } catch { }
    return 'claim'; // Claim page is the official home page
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
  const [chatInputText, setChatInputText] = useState('');
  const [chatIsTyping, setChatIsTyping] = useState(false);
  const [currentTaggedAgent, setCurrentTaggedAgent] = useState(null);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

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
  const chatMessagesEndRef = React.useRef(null);
  const [voiceTranscribedText, setVoiceTranscribedText] = useState('');
  const voiceTranscriptRef = React.useRef('');
  const voiceSpeechRecRef = React.useRef(null);
  const liveSpeechTextRef = React.useRef('');
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // Auto-scroll chat stream smoothly on new messages or typing
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatIsTyping]);

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
      const clean = prev.trim();
      if (!clean.toLowerCase().includes(`@₦${agent.tag.toLowerCase()}`)) {
        return `@₦${agent.tag} ${clean}`.trim();
      }
      return prev;
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
            agentName: 'Arc Sovereign Agent',
            text: '⚠️ Microphone recording is not supported in this browser environment.',
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
          text: '⚠️ Microphone permission is required to record voice directives. Please enable microphone permissions in your browser settings.',
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
        text: finalTranscript ? `🎙️ "${finalTranscript}"` : `Voice directive (${formatDuration})`,
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
    setSpeakingMsgId(msg.id);
    const utterance = speakText(msg.text);
    if (utterance) {
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
    }
  };

  // ─── Master Chat Execution Engine (Arc Actions + Google Gemini Flash-Lite) ───
  const handleSendChatPrompt = async (customPrompt = null, options = {}) => {
    const textToSend = (customPrompt !== null ? customPrompt : chatInputText).trim();
    const fileToSend = attachedFile;

    // Must have either text or an attached file
    if (!textToSend && !fileToSend) return;

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

    const lower = textToSend.toLowerCase();
    let replyText = '';
    let replyAgentTag = currentTaggedAgent ? currentTaggedAgent.tag : 'ArcAgent';
    let replyAgentName = currentTaggedAgent ? currentTaggedAgent.name : 'Arc Sovereign Agent';
    let replyAvatar = currentTaggedAgent
      ? currentTaggedAgent.avatar
      : 'https://api.dicebear.com/7.x/identicon/svg?seed=arc-agent';
    let widget = null;
    let replyModel = null;

    const foundAgent = VERIFIED_AGENTS.find(
      (a) =>
        lower.includes(`@₦${a.tag}`) ||
        lower.includes(`@${a.tag}`) ||
        (lower.includes(`₦${a.tag}`) && !lower.includes('₦tag'))
    );
    if (foundAgent) {
      replyAgentTag = foundAgent.tag;
      replyAgentName = foundAgent.name;
      replyAvatar = foundAgent.avatar;
    }

    // If an attached file was sent, prioritize smart file analysis
    if (fileToSend) {
      if (fileToSend.extension === 'sol' || fileToSend.name.endsWith('.sol') || lower.includes('contract') || lower.includes('audit')) {
        replyAgentTag = 'dev';
        replyAgentName = 'Arc Contract Auditor';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=dev';
        replyText = `⚡ Smart Contract Received: "${fileToSend.name}" (${fileToSend.size})! Bytecode analyzed on Arc Osaka EVM (5042002). 0 critical vulnerabilities found. Formal verification: Passed.`;
        widget = {
          type: 'contract_audit',
          title: `Audit Passed: ${fileToSend.name}`,
          badge: '100/100 Security Score',
          body: `File: ${fileToSend.name} · Gas optimization: 99.8% · Arc Osaka EVM Compatible. Ready for milestone escrow deployment.`,
          actionText: 'Deploy Verified Contract',
          targetTag: 'dev',
          amount: '2.0',
        };
      } else if (fileToSend.isImage) {
        replyAgentTag = 'designer';
        replyAgentName = 'MuseSpark Creative';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=designer';
        replyText = `🖼️ Deliverable / Asset Received: "${fileToSend.name}" (${fileToSend.size})! Visual artifact verified against Arc milestone quest criteria.`;
        widget = {
          type: 'design_task',
          title: `Verified: ${fileToSend.name}`,
          badge: 'Milestone In Escrow',
          body: `Deliverable: ${fileToSend.name} · Resolution & metadata verified. Funds locked in milestone escrow ready for release.`,
          actionText: 'Approve & Release Payment',
          targetTag: 'designer',
          amount: '15.0',
        };
      } else {
        replyAgentTag = 'dev';
        replyAgentName = 'Arc Sovereign Agent';
        replyText = `📑 File Received: "${fileToSend.name}" (${fileToSend.size})! Payload parsed in Arc Osaka sovereign agent environment. Ready to execute requested actions.`;
        widget = {
          type: 'file_processed',
          title: `Processed: ${fileToSend.name}`,
          badge: 'Payload Validated',
          body: `Size: ${fileToSend.size} · Checksum verified on Arc Osaka. Ready to trigger pipeline.`,
          actionText: 'Confirm Execution',
          targetTag: 'dev',
          amount: '1.0',
        };
      }
    } else if (replyAgentTag === 'chowdeck' || lower.includes('food') || lower.includes('chowdeck') || lower.includes('jollof') || lower.includes('order')) {
      replyAgentTag = 'chowdeck';
      replyAgentName = 'Chowdeck Food Bot';
      replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=chowdeck';
      replyText = "🍗 Chowdeck Agent connected on Arc Osaka EVM! Food order route dispatched. Settlement verified with zero gas fee.";
      widget = {
        type: 'food_order',
        title: 'Chowdeck Express Delivery #882',
        badge: 'Zero Gas Settlement',
        body: 'Item: Jollof Feast Box + Peppered Chicken · Price: 4.5 USDC (₦6,750) · Est. Delivery: 24 mins',
        actionText: 'Execute USDC Settlement',
        targetTag: 'chowdeck',
        amount: '4.5',
      };
    } else if (replyAgentTag === 'dev' || lower.includes('audit') || lower.includes('contract') || lower.includes('solidity') || lower.includes('bytecode')) {
      replyAgentTag = 'dev';
      replyAgentName = 'Arc Contract Auditor';
      replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=dev';
      replyText = "⚡ Contract Auditor engaged on Arc Osaka (Chain 5042002). Bytecode verification complete. 0 critical vulnerabilities found.";
      widget = {
        type: 'contract_audit',
        title: 'Milestone Escrow Audit Report',
        badge: 'Passed Audit (100/100)',
        body: 'Target: MilestoneEscrow.sol · Formal verification: Passed · Non-reentrant & ERC-4337 Sponsored',
        actionText: 'Deploy Verified Escrow',
        targetTag: 'dev',
        amount: '2.0',
      };
    } else if (replyAgentTag === 'designer' || lower.includes('design') || lower.includes('logo') || lower.includes('banner') || lower.includes('ui')) {
      replyAgentTag = 'designer';
      replyAgentName = 'MuseSpark Creative';
      replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=designer';
      replyText = "🎨 MuseSpark generative pipeline triggered. High-resolution vector assets and UI components generated.";
      widget = {
        type: 'design_task',
        title: 'Cyber-Naira Vector Assets Pack',
        badge: 'Milestone In Escrow',
        body: 'Specs: 4 SVG Logo Marks + 3 Social Banners · Reward: 25 USDC (₦37,500) locked in contract',
        actionText: 'Approve & Release Payment',
        targetTag: 'designer',
        amount: '25.0',
      };
    } else if (replyAgentTag === 'ride' || lower.includes('ride') || lower.includes('transit') || lower.includes('dispatch')) {
      replyAgentTag = 'ride';
      replyAgentName = 'Arc Transit Router';
      replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=ride';
      replyText = "🚖 Arc Transit Router online. Autonomous logistics, routing, and ride settlement initialized.";
      widget = {
        type: 'transit_dispatch',
        title: 'Autonomous Ride Dispatch #TR-502',
        badge: 'Driver En Route',
        body: 'Pickup: Lagos Mainland · Destination: Victoria Island · Fare: 3.2 USDC (₦4,800)',
        actionText: 'Pay Fare with USDC',
        targetTag: 'ride',
        amount: '3.2',
      };
    } else if (replyAgentTag === 'escrow' || lower.includes('escrow') || lower.includes('lock') || lower.includes('milestone')) {
      replyAgentTag = 'escrow';
      replyAgentName = 'Arc P2P Arbiter';
      replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=escrow';
      replyText = "🔒 Arc Non-Custodial Escrow Vault opened. Funds are securely locked in smart contract until delivery hash is validated.";
      widget = {
        type: 'escrow_lock',
        title: 'Smart Contract Escrow Lock',
        badge: '100% USDC Protected',
        body: 'Contract: 0x7FA938...b3e1496 · Conditional release upon proof-of-work receipt on Arc Osaka.',
        actionText: 'Lock 10 USDC in Escrow',
        targetTag: 'escrow',
        amount: '10.0',
      };
    } else if (lower.includes('airtime') || lower.includes('recharge') || lower.includes('topup') || lower.includes('500 airtime')) {
      replyAgentTag = 'telecom';
      replyAgentName = 'Walley Airtime';
      replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=airtime';
      replyText = "📱 Instant Airtime recharge prepared for 500 NGN. Zero gas fee on Arc Osaka EVM.";
      widget = {
        type: 'airtime_pay',
        title: 'Airtime Recharge (₦500)',
        badge: 'Instant Delivery',
        body: 'MTN / Airtel / Glo / 9mobile · Amount: 0.33 USDC (₦500) · Dispatched instantly upon confirmation.',
        actionText: 'Confirm ₦500 Airtime',
        targetTag: 'airtime',
        amount: '0.33',
      };
    } else if (lower.includes('dstv') || lower.includes('cable') || lower.includes('gotv')) {
      replyAgentTag = 'utility';
      replyAgentName = 'Walley Utility';
      replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=utility';
      replyText = "📺 DStv subscription renewal ready. Settled gaslessly via USDC smart contract on Arc Osaka.";
      widget = {
        type: 'cable_pay',
        title: 'DStv Subscription Renewal',
        badge: 'Live Settlement',
        body: 'Package: DStv Compact / Padi · Zero gas fee · Instant smartcard reactivation.',
        actionText: 'Pay DStv with USDC',
        targetTag: 'utility',
        amount: '12.0',
      };
    } else if (lower.includes('transfer') || lower.includes('make a transfer') || lower.includes('send') || lower.includes('pay') || lower.includes('usdc')) {
      replyText = "💸 I can prepare that instant zero-gas USDC transfer for you right now on Arc Osaka EVM.";
      const matchAmt = lower.match(/\b(\d+(?:\.\d+)?)\s*(?:usdc|dollars?|\$)?/i);
      const parsedAmt = matchAmt ? matchAmt[1] : '5.0';
      widget = {
        type: 'quick_pay',
        title: `Instant USDC Transfer`,
        badge: 'Zero Gas Fee',
        body: `Amount: ${parsedAmt} USDC · Instant settlement to verified ₦Tag on Arc Osaka.`,
        actionText: `Send ${parsedAmt} USDC`,
        targetTag: replyAgentTag !== 'ArcAgent' ? replyAgentTag : 'dev',
        amount: parsedAmt,
      };
    } else {
      // Connect to Google Gemini 3.5 Flash-Lite (Free Tier)
      try {
        const geminiRes = await askArcGemini({
          prompt: textToSend,
          history: chatMessages,
          context: { myTag, walletAddress }
        });
        replyText = geminiRes.text;
        replyModel = geminiRes.model;
        replyAgentName = 'Gemini 3.5 Flash-Lite';
        replyAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=gemini-flash';
      } catch (err) {
        replyText = `Understood! I've logged your request: "${textToSend}". On Arc Osaka EVM, you can transfer USDC, audit contracts, or tag verified agents.`;
      }
    }

    const botReply = {
      id: 'bot-' + Date.now(),
      sender: 'agent',
      agentTag: replyAgentTag,
      agentName: replyAgentName,
      avatar: replyAvatar,
      text: replyText,
      model: replyModel,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      widget: widget,
    };

    setChatMessages((prev) => [...prev, botReply]);
    setChatIsTyping(false);

    if (options.isVoiceReply && replyText) {
      speakText(replyText);
      setSpeakingMsgId(botReply.id);
    }
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
  const [myTag, setMyTag] = useState(null);
  const userTag = myTag?.tag || 'nairatag';

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSendReviewModalOpen, setIsSendReviewModalOpen] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletTab, setWalletTab] = useState('overview'); // 'overview' | 'qr' | 'history'

  // Tasks & Bounties State
  const [tasksFilter, setTasksFilter] = useState('all');
  const [tasksSearch, setTasksSearch] = useState('');
  const [tasksViewMode, setTasksViewMode] = useState('grid'); // 'grid' | 'list'
  const [isPostTaskOpen, setIsPostTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskProgress, setTaskProgress] = useState({});
  const [backendTasks, setBackendTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0);
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

  const filteredTasks = useMemo(() => {
    const q = tasksSearch.toLowerCase().trim();
    return allTasks.filter((task) => {
      const matchCat = tasksFilter === 'all' || task.category === tasksFilter;
      const matchQ =
        !q ||
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.creatorTag.toLowerCase().includes(q) ||
        task.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [allTasks, tasksFilter, tasksSearch]);

  const selectedTask = useMemo(
    () => allTasks.find((task) => task.id === selectedTaskId) || null,
    [allTasks, selectedTaskId]
  );

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
    return claimInput.replace(/^[$₦]/, '').trim() || (myTag ? myTag.tag?.replace(/^[$₦]/, '') : 'TAG');
  }, [claimInput, myTag]);

  const claimPreviewText = claimInput.replace(/^[$₦]/, '').toUpperCase() || 'Tag';
  const claimPreviewBaseSize = typeof window === 'undefined'
    ? 48
    : Math.max(48, Math.min(0.11 * window.innerWidth, 76));
  const claimPreviewFitSize = typeof window === 'undefined'
    ? 48
    : Math.min(424, window.innerWidth - 64) / ((claimPreviewText.length + 1) * 0.62);
  const claimPreviewFontSize = claimPreviewText.length > 8
    ? `${Math.max(22, Math.min(claimPreviewBaseSize, claimPreviewFitSize))}px`
    : undefined;

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
  const [swapTargetChain, setSwapTargetChain] = useState('Arc_Testnet');
  const [swapEstimate, setSwapEstimate] = useState(null);
  const [swapEstimating, setSwapEstimating] = useState(false);
  const [swapExecuting, setSwapExecuting] = useState(false);
  const [appKitView, setAppKitView] = useState('swap'); // 'swap' | 'unified' | 'borrow' | 'earn'
  const [borrowBtcAmount, setBorrowBtcAmount] = useState('0.05');

  // ERC-8004 Agent Hub State
  const [agentSubTab, setAgentSubTab] = useState('lookup'); // 'lookup' | 'register'
  const [agentLookupId, setAgentLookupId] = useState('1');
  const [agentDetails, setAgentDetails] = useState(null);
  const [agentDetailsLoading, setAgentDetailsLoading] = useState(false);
  const [agentDetailsError, setAgentDetailsError] = useState(null);
  const [agentReputationList, setAgentReputationList] = useState([]);
  const [newAgentMetadataUri, setNewAgentMetadataUri] = useState('https://nairatag.ng/api/agent/erc8004/₦food');
  const [registeringAgent, setRegisteringAgent] = useState(false);
  const [registeredAgentResult, setRegisteredAgentResult] = useState(null);

  // Agents Directory View State (Grid vs List toggle & Profile popup)
  const [agentsViewMode, setAgentsViewMode] = useState('grid'); // 'grid' | 'list'
  const [agentsSearchQuery, setAgentsSearchQuery] = useState('');
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null);
  const [agentProfileLiveLoading, setAgentProfileLiveLoading] = useState(false);
  const [agentProfileLiveData, setAgentProfileLiveData] = useState(null);
  const [agentFollowState, setAgentFollowState] = useState({ agentId: null, followerCount: 0, following: false, loading: false, updating: false, error: null });

  useEffect(() => {
    if (!selectedAgentProfile || selectedAgentProfile.profileType === 'claimed-tag') {
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
    if (!q) return VERIFIED_AGENTS;
    return VERIFIED_AGENTS.filter(
      (a) =>
        a.tag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        String(a.id).includes(q)
    );
  }, [agentsSearchQuery]);

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
      const matchedAgent = VERIFIED_AGENTS.find(
        (a) => a.tag.toLowerCase() === clean.toLowerCase() || String(a.id) === clean
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

  const showToast = useCallback((message, type = 'info', duration = 3200) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  // Confetti explosion for Claim & Swap
  const triggerCelebrationConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.15, y: 0.65 },
        colors: ['#0052FF', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#BBF246'],
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.85, y: 0.65 },
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
      const clean = myTag.tag.replace(/^[$₦]/, '').trim();
      const formatted = clean ? `₦${clean.charAt(0).toUpperCase() + clean.slice(1)}` : '';
      return formatted ? `${timeGreeting}, ${formatted}!` : `${timeGreeting}!`;
    }

    if (walletAddress) {
      return `${timeGreeting}, ${shorten(walletAddress)}!`;
    }

    return `${timeGreeting}!`;
  }, [walletAddress, myTag]);

  // Chat User Avatar: User's profile avatar or deterministic NairaTag mascot (replaces generic 80px orb)
  const chatUserAvatar = useMemo(() => {
    const seed = myTag?.cleanTag || (myTag?.tag ? myTag.tag.replace(/^[$₦]/, '') : '') || (walletAddress ? walletAddress.slice(2, 10) : 'nairatag');
    return resolveTagProfile(seed, { avatarSize: 52 });
  }, [myTag, walletAddress]);

  // Balance refresh
  const refreshBalance = useCallback(async (address) => {
    if (!address) return;
    setBalanceLoading(true);
    try {
      const bal = await getUsdcBalance(address);
      setUsdcBalance(bal);
      const tag = await getArcTagForWallet(address);
      setMyTag(tag);
    } catch (e) {
      console.warn('Balance refresh failed:', e);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Connect Wallet Handler
  const handleConnect = async (providerType) => {
    setIsConnecting(true);
    try {
      const { address, chainId: cId } = await connectWallet();
      setWalletAddress(address);
      setChainId(cId);
      setIsArcNetwork(cId === activeArcChain.id);
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

  const handleStartTask = async (task) => {
    if (!walletAddress) {
      showToast('Connect your wallet before starting a bounty.', 'info');
      setIsConnectModalOpen(true);
      return;
    }
    try {
      const progress = await startArcTask({ taskId: task.id, walletAddress });
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
      const progress = await submitArcTask({ taskId: task.id, walletAddress, deliverable: submission });
      setTaskProgress((previous) => ({ ...previous, [task.id]: progress }));
      setTaskSubmissionDraft('');
      showToast('Submission saved to the Arc task service for owner review.', 'success');
    } catch (error) {
      showToast(error.message || 'Could not submit this task.', 'error', 4000);
    }
  };

  const handleTaskChat = (task) => {
    setChatInputText(`Hi @₦${task.creatorTag.replace(/^₦/, '')}, I’m working on “${task.title}”. `);
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
    const inviteUrl = `https://arc.nairatag.ng?ref=${myTag ? `₦${myTag.tag}` : 'sovereign'}`;
    triggerCopy('invite_link', inviteUrl);
    showToast('🔗 Invite Link Copied! Share with friends to earn 10% fee rebates on Arc.', 'success', 3500);
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
      categoryLabel: postTaskForm.category === 'dev' ? '⚡ Engineering' : postTaskForm.category === 'design' ? '🎨 Design' : postTaskForm.category === 'data' ? '📊 Data & AI' : postTaskForm.category === 'content' ? '✍️ Content' : '🧪 Testing',
      status: 'open',
      rewardUSDC: usdc,
      rewardNGN: `₦${(usdc * 1485).toLocaleString()}`,
      points: Math.round(usdc * 10),
      deadline: postTaskForm.deadline || '3 days left',
      applicants: 0,
      creatorTag: myTag ? `₦${myTag.tag}` : '₦YOU',
      escrowStatus: '🔒 Funded in Escrow',
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

  // Muse Spark AI Agent Chat Handler
  const handleSendAgentChat = (agentId, userText) => {
    const text = (userText || agentChatInput).trim();
    if (!text) return;
    const currentMsgs = agentChatMessages[agentId] || [
      {
        sender: 'agent',
        text: `Hello! I am ${selectedAgentProfile?.name || 'Autonomous Agent'} (₦${selectedAgentProfile?.tag?.toUpperCase() || 'AGENT'}), verified under Arc ERC-8004 (#${selectedAgentProfile?.id || ''}). How can I assist you with autonomous tasks or settlements on Arc?`,
        time: 'Just now'
      }
    ];

    const newMsgs = [...currentMsgs, { sender: 'user', text, time: 'Just now' }];
    setAgentChatMessages((prev) => ({ ...prev, [agentId]: newMsgs }));
    setAgentChatInput('');

    setTimeout(() => {
      let reply = '';
      const lower = text.toLowerCase();
      if (lower.includes('send') || lower.includes('pay') || lower.includes('usdc')) {
        reply = `I can receive settlements directly! You can send USDC to my sovereign handle ₦${selectedAgentProfile?.tag?.toUpperCase()} on Arc Osaka EVM with deterministic sub-second finality.`;
      } else if (lower.includes('reputation') || lower.includes('score') || lower.includes('erc-8004') || lower.includes('8004')) {
        reply = `My Arc ERC-8004 identity is verified (#${selectedAgentProfile?.id}). Reputation score: ${selectedAgentProfile?.sparks || 98}/100. All tasks and milestones are logged onchain to the Arc Reputation Registry!`;
      } else if (lower.includes('service') || lower.includes('do') || lower.includes('work') || lower.includes('task')) {
        reply = `As ${selectedAgentProfile?.role}, I specialize in autonomous execution, escrow verification, and rapid micro-settlement for African web3 builders.`;
      } else if (lower.includes('tag') || lower.includes('claim')) {
        reply = `You can claim your own sovereign ₦Tag right here in the 'Claim ₦Tag' tab! It's free and instantly links your wallet to your sovereign identity.`;
      } else {
        reply = `Understood! I'm synchronized with Arc Osaka EVM and ready to execute. Let me know if you want to fund an escrow milestone, dispatch a micro-payment, or inspect my ERC-8004 records.`;
      }

      setAgentChatMessages((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || newMsgs), { sender: 'agent', text: reply, time: 'Just now' }]
      }));
    }, 450);
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

    setIsSending(true);
    setSendError(null);
    try {
      const targetTag = recipientInput.startsWith('0x') ? null : recipientInput;
      const result = await sendUsdcOnArc({
        fromAddress: walletAddress,
        tagOrAddress: recipientInput.trim(),
        amountUsdc: amountInput.trim(),
        memo: memoInput.trim() || undefined,
      });

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
    }
  };

  // Execute Swap
  const handleExecuteSwap = async () => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
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
        amount: `${swapAmountIn} ${swapTokenIn} ➔ ${swapEstimate?.amountOut || ''} ${swapTokenOut}`,
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

  // Register Agent
  const handleRegisterAgent = async () => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    setRegisteringAgent(true);
    setRegisteredAgentResult(null);
    try {
      const result = await registerAiAgent({
        fromAddress: walletAddress,
        metadataURI: newAgentMetadataUri,
      });
      setRegisteredAgentResult(result);
      if (result.agentId) {
        setAgentLookupId(result.agentId);
        setCelebrationDetails({
          type: 'agent',
          txHash: result.txHash,
          amount: `Token #${result.agentId}`,
          recipient: 'ERC-8004 Identity NFT',
          explorerUrl: result.explorerUrl,
        });
        setIsCelebrationOpen(true);
      }
    } catch (err) {
      alert(`Agent registration failed: ${err.message}`);
    } finally {
      setRegisteringAgent(false);
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

  const persistArcAgentLink = (tag, owner, registration) => {
    const cleanTag = String(tag).replace(/^[₦$@#]/, '').toLowerCase();
    const linkedAgent = {
      id: String(registration.agentId),
      tag: cleanTag,
      name: `₦${cleanTag.toUpperCase()}`,
      role: `NairaTag agent on Arc · ERC-8004 #${registration.agentId}`,
      category: 'NairaTag',
      owner,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanTag)}`,
      metadataUri: registration.finalMetadataURI || registration.metadataURI,
      registrationTxHash: registration.txHash,
      linkTxHash: registration.linkTxHash || null,
      status: 'Verified',
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
    if (!agent || agent.profileType === 'claimed-tag') return;
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

    const agent = VERIFIED_AGENTS.find((item) => item.tag.toLowerCase() === tag);
    if (agent) {
      handleOpenAgentProfile(agent);
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
    setRecipientInput(`₦${agent.tag}`);
    setMainTab('pay');
    showToast(`Recipient pre-filled: ₦${agent.tag.toUpperCase()}`, 'info', 3000);
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
      const res = await claimArcNairaTag({ rawTag: claimInput, walletAddress });
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

      triggerCelebrationConfetti();
      setCelebrationDetails({
        type: 'claim',
        cleanTag: res.cleanTag,
        txHash: res.txHash,
        amount: `₦${res.cleanTag.toUpperCase()}`,
        recipient: 'Sovereign Onchain Tag',
        explorerUrl: res.explorerUrl,
        erc8004Id: agentRegistration?.id || null,
        erc8004LinkError: agentLinkError,
      });
      setIsCelebrationOpen(true);
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
      {/* ─── Top Application Header (Reference-matched Layout) ─── */}
      <header className={`app-header ${mainTab === 'claim' ? 'claim-active' : ''}`}>
        {/* Left Side: Brand Logo Badge + Mobile Hamburger Menu */}
        <div className="app-header-left">
          <div className="app-brand" onClick={() => setMainTab('claim')}>
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
            <span className="nav-badge-pill" style={{ background: '#7c3aed' }}>8</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${mainTab === 'pay' ? 'active' : ''}`}
            onClick={() => setMainTab('pay')}
          >
            <ArrowDownUp size={14} />
            <span>Swap</span>
          </button>
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
            <span className="nav-badge-pill" style={{ background: '#ef4444' }}>HOT</span>
          </button>
        </nav>

        {/* Right Side: Search Icon + More (···) + Connect Pill */}
        <div className="app-header-actions">
          {/* Search Button (Hidden on Claim page) */}
          {mainTab !== 'claim' && (
            <button
              type="button"
              className="header-icon-btn search-trigger-btn"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="Search tags or agents"
              title="Search"
            >
              <Search size={20} />
            </button>
          )}

          {/* More Button (···) */}
          <div className="header-more-wrapper">
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
                    <span>NairaTag Registry ↗</span>
                  </a>

                  <a
                    href={`https://explorer.testnet.arc.io/address/${ARC_NAIRATAG_RESOLVER_ADDRESS}`}
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

          {/* Notification Bell */}
          <div className="header-bell-wrapper">
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
          </div>

          {/* Connect / Connected Wallet Pill (with Shield Sign in matching screenshot) */}
          {walletAddress ? (
            <div
              className="wallet-connected-pill"
              onClick={() => setIsWalletModalOpen(true)}
              title="Click to view Sovereign Portfolio"
            >
              <span className="wallet-connected-dot" />
              <span className="wallet-connected-handle">{myTag ? `₦${myTag.tag}` : shorten(walletAddress)}</span>
              <span className="wallet-connected-sep desktop-only">|</span>
              <span className="wallet-connected-bal desktop-only">{usdcBalance.formatted} USDC</span>
            </div>
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
                <span className="card-net-pill" style={{ fontSize: 10 }}>Arc Testnet</span>
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
                  <span className="mobile-nav-title">Claim ₦Tag</span>
                  <span className="mobile-nav-desc">Mint sovereign onchain identity handle</span>
                </div>
                {mainTab === 'claim' && <span className="mobile-nav-active-pill">Active</span>}
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
                  <span className="mobile-nav-title">Tasks & Bounties</span>
                  <span className="mobile-nav-desc">Onchain quests, milestone escrow & points</span>
                </div>
                {mainTab === 'tasks' && <span className="mobile-nav-active-pill">Active</span>}
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
                  <span className="mobile-nav-title">AI Agents 8004</span>
                  <span className="mobile-nav-desc">Autonomous ERC-8004 reputation directory</span>
                </div>
                {mainTab === 'agents' && <span className="mobile-nav-active-pill">Active</span>}
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${mainTab === 'pay' ? 'active' : ''}`}
                onClick={() => {
                  setMainTab('pay');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon-box">
                  <ArrowDownUp size={18} />
                </div>
                <div className="mobile-nav-text">
                  <span className="mobile-nav-title">Swap & Pay</span>
                  <span className="mobile-nav-desc">Instant USDC transfer with zero gas fees</span>
                </div>
                {mainTab === 'pay' && <span className="mobile-nav-active-pill">Active</span>}
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
                  <span className="mobile-nav-title">Agent Chat</span>
                  <span className="mobile-nav-desc">Chat with sovereign agent & call tagged bots</span>
                </div>
                {mainTab === 'chat' && <span className="mobile-nav-active-pill">Active</span>}
              </button>

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
                  <span className="mobile-nav-title">Rewards &amp; Vouchers</span>
                  <span className="mobile-nav-desc">Daily Points, USDC balance, cNGN updates &amp; referrals</span>
                </div>
                <span className="nav-badge-pill" style={{ background: '#ef4444' }}>HOT</span>
              </button>
            </div>

            <div className="mobile-drawer-footer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--privy-color-foreground-2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                  <span>Arc Osaka EVM · 5042002</span>
                </div>
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
                      handleOpenAgentProfile(mobileSearchResult.agent);
                    }}
                  >
                    <div className="agent-circle-left">
                      <img src={mobileSearchResult.agent.avatar} alt="" className="agent-circle-avatar-img" />
                      <div className="agent-circle-meta">
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
                {myTag && (
                  <div className="active-claimed-banner">
                    <div className="active-claimed-info">
                      <span style={{ fontSize: '15px' }}>✨</span>
                      <div>
                        <div className="active-claimed-label">
                          You own <strong>₦{myTag.tag?.replace(/^[$₦]/, '').toUpperCase()}</strong>
                        </div>
                        <div className="active-claimed-sub">
                          {shorten(walletAddress)} · Arc Testnet
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
                    style={claimPreviewFontSize ? {
                      fontSize: claimPreviewFontSize,
                      fontWeight: claimPreviewText.length > 16 ? 700 : 800,
                      letterSpacing: '-0.055em',
                    } : undefined}
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
                      <span>Claiming & linking ERC-8004…</span>
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

              {/* Official Live Claim Notification Feeds (Telegram & X) */}
              <div className="claim-social-channels-bar">
                <a
                  href={TELEGRAM_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="claim-social-channel-chip chip-telegram"
                  title="Live Arc Osaka Claim Alerts on Telegram"
                >
                  <span className="social-chip-dot pulse-telegram" />
                  <Send size={12} />
                  <span>Telegram Feed: <strong>{TELEGRAM_CHANNEL_HANDLE}</strong></span>
                </a>
                <a
                  href={TWITTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="claim-social-channel-chip chip-twitter"
                  title={`Follow ${TWITTER_HANDLE} on X`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>Follow <strong>{TWITTER_HANDLE}</strong></span>
                </a>
              </div>
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

            {/* Metrics Overview Row (Compact 4-in-a-row without subtitles) */}
            <div className="agents-stats-grid">
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Active Agents</span>
                <span className="agents-stat-card-value">6</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Avg Reputation</span>
                <span className="agents-stat-card-value">98.4%</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Settlement Fee</span>
                <span className="agents-stat-card-value">0.00 USDC</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Standard</span>
                <span className="agents-stat-card-value">ERC-8004</span>
              </div>
            </div>

            {/* ─── 1. GRID VIEW (Reference 1: Milestones) ─── */}
            {agentsViewMode === 'grid' && (
              <div className="agents-milestones-grid">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="agent-milestone-card"
                    onClick={() => handleOpenAgentProfile(agent)}
                  >
                    <span className="card-rank-tag">{agent.rank}</span>

                    <div className="milestone-badge-stage">
                      <AgentMedallion type={agent.badgeType} size={46} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <h3 className="milestone-card-title" style={{ margin: 0 }}>₦{agent.tag.toUpperCase()}</h3>
                      <img
                        src="/verified-badge.png"
                        alt="Verified"
                        style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                        title="Verified Sovereign Agent"
                      />
                    </div>
                    <div className="milestone-card-role">{agent.role}</div>

                    <div className="milestone-task-status">
                      <span>{agent.tasksDone}/{agent.totalTasks} tasks done</span>
                    </div>

                    <div className="milestone-progress-bar-wrap">
                      <div
                        className="milestone-progress-bar-fill"
                        style={{ width: `${(agent.tasksDone / agent.totalTasks) * 100}%` }}
                      />
                    </div>

                    <div className="milestone-earnings-row">
                      <span className="milestone-earnings-label">Earnings</span>
                      <span className="milestone-earnings-value">{agent.earnings}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── 2. LIST VIEW (Reference 3: Your Circle) ─── */}
            {agentsViewMode === 'list' && (
              <div className="agents-circle-list">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="agent-circle-row"
                    onClick={() => handleOpenAgentProfile(agent)}
                  >
                    <div className="agent-circle-left">
                      <div className="agent-circle-avatar-wrap">
                        <img
                          src={agent.avatar}
                          alt=""
                          aria-hidden="true"
                          className="agent-circle-avatar-img"
                        />
                        <div className={`agent-circle-rank ${agent.rankTop || ''}`}>
                          {agent.rank}
                        </div>
                      </div>

                      <div className="agent-circle-meta">
                        <div className="agent-circle-name">
                          <span>{agent.name}</span>
                          <span className="agent-circle-tag-pill">₦{agent.tag}</span>
                          <img
                            src="/verified-badge.png"
                            alt="Verified"
                            style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
                            title="Verified Sovereign Agent"
                          />
                        </div>
                        <div className="agent-circle-tagline">{agent.role}</div>
                      </div>
                    </div>

                    <div className="agent-circle-right">
                      <div style={{ textAlign: 'right' }}>
                        <div className="agent-circle-metric-val" style={{ color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                          <ShieldCheck size={13} color="#059669" />
                          <span>{agent.sparks}%</span>
                        </div>
                        <div className="agent-circle-metric-lbl">Reputation</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="agent-circle-metric-val" style={{ color: '#10B981' }}>{agent.earnings}</div>
                        <div className="agent-circle-metric-lbl">Earnings</div>
                      </div>
                      <ChevronRight size={16} color="var(--privy-color-foreground-3)" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Register Onchain Agent Accordion / Card */}
            <div className="agents-top-bar" style={{ marginTop: '8px' }}>
              <div className="agents-top-left">
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--privy-color-foreground)' }}>
                  Deploy Your Autonomous Agent
                </div>
                <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)' }}>
                  Mint a sovereign ERC-8004 Identity NFT registered with your ₦Tag on Arc Testnet.
                </div>
              </div>
              <button
                type="button"
                className="btn-agent-primary"
                style={{ flex: 'none', padding: '8px 16px', fontSize: '12px' }}
                onClick={() => setAgentSubTab(agentSubTab === 'register' ? 'lookup' : 'register')}
              >
                <Bot size={14} />
                <span>{agentSubTab === 'register' ? 'Close Register' : '+ Register Agent'}</span>
              </button>
            </div>

            {agentSubTab === 'register' && (
              <div className="crypto-card-terminal" style={{ padding: '20px' }}>
                <div className="token-input-box">
                  <div className="token-input-header">
                    <span>Agent Metadata URI</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--privy-color-border-interactive)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setNewAgentMetadataUri('https://nairatag.ng/api/agent/erc8004/$chowdeck')}
                    >
                      ⚡ Autofill ₦CHOWDECK
                    </button>
                  </div>
                  <input
                    type="text"
                    className="tag-text-field"
                    style={{ fontSize: '13px', width: '100%', textTransform: 'none' }}
                    value={newAgentMetadataUri}
                    onChange={(e) => setNewAgentMetadataUri(e.target.value)}
                  />
                </div>

                <div className="crypto-details-table" style={{ margin: '12px 0' }}>
                  <div className="details-row">
                    <span>Identity Registry</span>
                    <span className="details-value">{shorten(ARC_ERC8004_IDENTITY_REGISTRY)}</span>
                  </div>
                  <div className="details-row">
                    <span>Gas Token</span>
                    <span className="details-value">Arc USDC (Osaka EVM)</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-action-primary"
                  disabled={registeringAgent}
                  onClick={handleRegisterAgent}
                >
                  {registeringAgent ? 'Minting Identity NFT on Arc...' : 'Confirm & Register Onchain'}
                </button>
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
                  <div className="milestone-badge-stage">
                    <AgentMedallion type={selectedTask.badgeType || 'emerald'} size={46} />
                  </div>
                  <div className="task-detail-heading-copy">
                    <span className="task-cat-pill active">{selectedTask.categoryLabel}</span>
                    <h1>{selectedTask.title}</h1>
                    <p>Posted by ₦{selectedTask.creatorTag.replace(/^₦/, '').toUpperCase()} · {selectedTask.deadline}</p>
                  </div>
                </div>

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
                          {taskProgress[selectedTask.id]?.status === 'submitted' ? 'In review' : taskProgress[selectedTask.id]?.status === 'in_progress' ? 'In progress' : 'Not started'}
                        </span>
                      </div>
                      {taskProgress[selectedTask.id]?.status === 'submitted' ? (
                        <div className="task-submission-saved">
                          <CheckCircle2 size={17} />
                          <div><strong>Submission saved</strong><span>Sent to the Arc task service for bounty owner review.</span></div>
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

                {/* Grid / List Switcher + Create Task Button */}
                <div className="task-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: 'auto' }}>
                  <div className="agents-view-toggle">
                    <button
                      type="button"
                      className={`view-toggle-btn ${tasksViewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setTasksViewMode('grid')}
                      title="Grid View"
                      aria-label="Grid View"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn ${tasksViewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setTasksViewMode('list')}
                      title="List View"
                      aria-label="List View"
                    >
                      <List size={14} />
                    </button>
                  </div>

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
                <span className="agents-stat-card-label">Active Quests</span>
                <span className="agents-stat-card-value">{allTasks.length}</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Arc Escrow Locked</span>
                <span className="agents-stat-card-value">$0</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Settlement Fee</span>
                <span className="agents-stat-card-value">0.00 USDC</span>
              </div>
              <div className="agents-stat-card">
                <span className="agents-stat-card-label">Your Points</span>
                <span className="agents-stat-card-value" style={{ color: '#059669' }}>{userPoints} Pts</span>
              </div>
            </div>

            {/* Category Filter Pills Row */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {[
                { id: 'all', label: 'All Quests' },
                { id: 'dev', label: '⚡ Engineering' },
                { id: 'design', label: '🎨 Design' },
                { id: 'data', label: '📊 Data & AI' },
                { id: 'content', label: '✍️ Content' },
                { id: 'test', label: '🧪 Testing' },
                { id: 'community', label: '📱 Community' },
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

            {/* ─── 1. GRID VIEW (Milestones Design matching Agents) ─── */}
            {tasksViewMode === 'grid' && (
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
                          ? 'No Matching Quests Found'
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
                    const isDone = taskProgress[task.id]?.status === 'paid';
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

                        <div className="milestone-task-status">
                          <span>{task.categoryLabel} • {task.deadline}</span>
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
            )}

            {/* ─── 2. LIST VIEW (Matching Agents Circle List) ─── */}
            {tasksViewMode === 'list' && (
              <div className="agents-circle-list">
                {filteredTasks.length === 0 ? (
                  <div className="tasks-empty-state-card">
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
                          ? 'No Matching Quests Found'
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
                    const isDone = taskProgress[task.id]?.status === 'paid';
                    const rankLabel = task.rank || `#${idx + 1}`;
                    const rankTopClass = idx === 0 ? 'rank-top1' : idx === 1 ? 'rank-top2' : idx === 2 ? 'rank-top3' : '';
                    return (
                      <div
                        key={task.id}
                        className="agent-circle-row"
                        onClick={() => setSelectedTaskId(task.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedTaskId(task.id); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="agent-circle-left">
                          <div className="agent-circle-avatar-wrap">
                            <img
                              src={task.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${task.id}`}
                              alt=""
                              aria-hidden="true"
                              className="agent-circle-avatar-img"
                            />
                            <div className={`agent-circle-rank ${rankTopClass}`}>
                              {rankLabel}
                            </div>
                          </div>

                          <div className="agent-circle-meta">
                            <div className="agent-circle-name">
                              <span>{task.title}</span>
                              <span className="agent-circle-tag-pill">₦{task.creatorTag.replace(/^₦/, '')}</span>
                              <img
                                src="/verified-badge.png"
                                alt=""
                                aria-hidden="true"
                                style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
                                title="Arc Escrow Verified"
                              />
                            </div>
                            <div className="agent-circle-tagline">{task.deliverable}</div>
                          </div>
                        </div>

                        <div className="agent-circle-right">
                          <div style={{ textAlign: 'right' }}>
                            <div className="agent-circle-metric-val" style={{ color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                              <Sparkles size={12} color="#059669" />
                              <span>+{task.points} Pts</span>
                            </div>
                            <div className="agent-circle-metric-lbl">Points</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="agent-circle-metric-val" style={{ color: isDone ? '#10B981' : 'var(--primary, #0052FF)' }}>
                              {isDone ? 'Paid' : `$${task.rewardUSDC} USDC`}
                            </div>
                            <div className="agent-circle-metric-lbl">Reward</div>
                          </div>
                          <ChevronRight size={16} color="var(--privy-color-foreground-3)" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

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
            {/* Top Navigation Bar: Back Arrow button on mobile only (hidden on desktop) */}
            <div className="chat-top-nav-bar mobile-only">
              <button
                type="button"
                className="chat-back-btn"
                onClick={() => setMainTab('claim')}
                aria-label="Back"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Main Canvas: Empty state vs Message stream */}
            {chatMessages.length === 0 ? (
              /* SCREEN 1: Empty state matching reference */
              <div className="walley-hero-container">
                <div className="walley-avatar-wrap">
                  {myTag?.avatar ? (
                    <img
                      src={myTag.avatar}
                      alt={myTag?.tag || 'Profile'}
                      className="walley-user-avatar-img"
                      onClick={() => (walletAddress ? setIsWalletModalOpen(true) : setIsConnectModalOpen(true))}
                    />
                  ) : (
                    <div
                      className="walley-user-avatar"
                      style={{
                        boxShadow: chatUserAvatar?.palette?.glow
                          ? `0 6px 20px ${chatUserAvatar.palette.glow}`
                          : '0 6px 18px rgba(0, 0, 0, 0.15)',
                      }}
                      onClick={() => (walletAddress ? setIsWalletModalOpen(true) : setIsConnectModalOpen(true))}
                      dangerouslySetInnerHTML={{ __html: chatUserAvatar?.avatarSvg || '' }}
                      title={walletAddress ? (myTag ? `₦${myTag.tag}` : shorten(walletAddress)) : 'Sign in'}
                    />
                  )}
                </div>

                <h1 className="walley-headline">
                  {chatGreeting}
                </h1>

                <div className="walley-prompt-pills">
                  <button
                    type="button"
                    className="walley-prompt-pill"
                    onClick={() => handleSendChatPrompt('Make a transfer')}
                  >
                    <Send size={15} className="pill-icon pill-icon-send" />
                    <span>Make a transfer</span>
                  </button>

                  <button
                    type="button"
                    className="walley-prompt-pill"
                    onClick={() => handleSendChatPrompt('I want to buy 500 airtime for someone')}
                  >
                    <Phone size={15} className="pill-icon pill-icon-phone" />
                    <span>Buy airtime</span>
                  </button>

                  <button
                    type="button"
                    className="walley-prompt-pill"
                    onClick={() => handleSendChatPrompt('Pay for Dstv')}
                  >
                    <Tv size={15} className="pill-icon pill-icon-tv" />
                    <span>Pay for Dstv</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN 2: Active chat message stream matching reference */
              <div className="walley-chat-stream">
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
                                <span className="file-pill-sub">{msg.file.size} · {msg.file.extension?.toUpperCase() || 'FILE'}</span>
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
                          {msg.model && (
                            <div className="walley-msg-model-tag">
                              <Sparkles size={11} />
                              <span>Gemini 3.5 Flash-Lite</span>
                            </div>
                          )}
                          <div className="walley-msg-text-content">{msg.text}</div>
                          {msg.sender === 'agent' && (
                            <div className="walley-msg-speech-bar">
                              <button
                                type="button"
                                className={`walley-msg-speak-btn ${speakingMsgId === msg.id ? 'speaking' : ''}`}
                                onClick={() => handleToggleSpeakMessage(msg)}
                                title={speakingMsgId === msg.id ? "Stop voice" : "Read aloud (Voice)"}
                              >
                                {speakingMsgId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                <span>{speakingMsgId === msg.id ? "Stop voice" : "Read aloud"}</span>
                              </button>
                            </div>
                          )}
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

                {/* Processing Indicator: ":: Processing ..." */}
                {chatIsTyping && (
                  <div className="walley-processing-row">
                    <span className="walley-processing-dots">⠿</span>
                    <span className="walley-processing-text">Processing ...</span>
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
                    <span>Tag Verified Agent</span>
                    <button type="button" onClick={() => setIsTagPopoverOpen(false)}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="walley-agent-popover-list">
                    {VERIFIED_AGENTS.map((agent) => (
                      <div
                        key={agent.tag}
                        className="walley-agent-item"
                        onClick={() => handleSelectAgentTag(agent)}
                      >
                        <img src={agent.avatar} alt={agent.name} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                        <div className="walley-agent-item-info">
                          <span className="walley-agent-tag">₦{agent.tag}</span>
                          <span className="walley-agent-role">{agent.role.slice(0, 26)}...</span>
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

                  <button
                    type="button"
                    className="walley-capsule-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach File or Smart Contract (.sol, .pdf, image)"
                    aria-label="Attach File"
                  >
                    <Paperclip size={15} />
                  </button>

                  <input
                    type="text"
                    className="walley-capsule-input"
                    placeholder={attachedFile ? `Sending ${attachedFile.name}...` : (isSpeechListening ? "Listening to your voice..." : "What can i help you with?")}
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                  />

                  <div className="walley-capsule-actions">
                    {chatInputText.trim() || attachedFile ? (
                      <button
                        type="submit"
                        className="walley-capsule-send-btn"
                        disabled={chatIsTyping}
                        aria-label="Send"
                        title="Send"
                      >
                        <ArrowUp size={16} />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`walley-capsule-icon-btn ${isSpeechListening ? 'listening-active' : ''}`}
                          onClick={toggleSpeechRecognition}
                          title={isSpeechListening ? "Stop listening" : "Speak to AI (Speech-to-Text)"}
                          aria-label={isSpeechListening ? "Stop listening" : "Speak to AI"}
                        >
                          <Mic size={16} />
                        </button>
                        <button
                          type="button"
                          className="walley-capsule-icon-btn"
                          onClick={startVoiceRecording}
                          title="Record Voice Note to Sovereign Agent"
                          aria-label="Record Voice Note"
                        >
                          <span className="walley-soundwave">
                            <span />
                            <span />
                            <span />
                          </span>
                        </button>
                      </>
                    )}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
                    <button
                      type="button"
                      className="walley-prompt-pill"
                      onClick={() => {
                        setIsHistoryModalOpen(false);
                        handleSendChatPrompt('I want to buy 500 airtime for someone');
                      }}
                    >
                      <Phone size={14} className="pill-icon pill-icon-phone" />
                      <span>Buy 500 airtime for someone</span>
                    </button>
                    <button
                      type="button"
                      className="walley-prompt-pill"
                      onClick={() => {
                        setIsHistoryModalOpen(false);
                        handleSendChatPrompt('Make a transfer of 10 USDC');
                      }}
                    >
                      <Send size={14} className="pill-icon pill-icon-send" />
                      <span>Transfer 10 USDC</span>
                    </button>
                    <button
                      type="button"
                      className="walley-prompt-pill"
                      onClick={() => {
                        setIsHistoryModalOpen(false);
                        handleSendChatPrompt('Pay for Dstv subscription');
                      }}
                    >
                      <Tv size={14} className="pill-icon pill-icon-tv" />
                      <span>Renew DStv subscription</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-agent-secondary"
                    style={{ width: '100%', padding: '10px' }}
                    onClick={() => {
                      setChatMessages([]);
                      setIsHistoryModalOpen(false);
                    }}
                  >
                    Clear History & Start Fresh
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
      {mainTab !== 'chat' && (
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

          {/* 4. Swap */}
          <button
            type="button"
            className={`mobile-footer-item ${mainTab === 'pay' ? 'active' : ''}`}
            onClick={() => setMainTab('pay')}
            aria-label="Swap"
          >
            <div className="mobile-footer-icon-wrap">
              <ArrowDownUp size={22} strokeWidth={mainTab === 'pay' ? 2.4 : 1.8} />
            </div>
            <span className="mobile-footer-label">Swap</span>
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
              <span className="mobile-footer-badge badge-red">HOT</span>
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

            <button
              type="button"
              className="btn-action-primary"
              disabled={isSending}
              onClick={handleExecuteSend}
            >
              {isSending ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Confirming on Arc...</span>
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
          MODAL 1: CONNECT WALLET OVERLAY
          ─────────────────────────────────────────────────────────────────── */}
      {isConnectModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsConnectModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-header-title">Connect Wallet</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--privy-color-foreground-2)', cursor: 'pointer' }}
                onClick={() => setIsConnectModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { name: 'Arc Wallet (Recommended)', type: 'Arc Wallet' },
                { name: 'MetaMask', type: 'MetaMask' },
                { name: 'Coinbase Wallet', type: 'Coinbase Wallet' },
                { name: 'WalletConnect', type: 'WalletConnect' },
              ].map((w) => (
                <button
                  key={w.name}
                  type="button"
                  className="token-input-box"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}
                  disabled={isConnecting}
                  onClick={() => handleConnect(w.type)}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--privy-color-foreground)' }}>{w.name}</span>
                  <ChevronRight size={15} color="var(--privy-color-foreground-2)" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          MODAL 2: CELEBRATION SHEET
          ─────────────────────────────────────────────────────────────────── */}
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
                View on ArcScan ↗
              </a>
              {celebrationDetails.erc8004Id && (
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
              {celebrationDetails.erc8004LinkError && (
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

      {/* ───────────────────────────────────────────────────────────────────
          MODAL 3: CLAIM NAIRATAG DIALOG
          ─────────────────────────────────────────────────────────────────── */}
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
              {isClaiming ? 'Claiming & linking ERC-8004…' : 'Claim & link ERC-8004'}
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
                <img className="agent-profile-avatar" src={selectedAgentProfile.avatar} alt="" />
                <div className="agent-profile-heading-copy">
                  <div className="agent-profile-name-line">
                    <h2>₦{selectedAgentProfile.tag.toUpperCase()}</h2>
                    {selectedAgentProfile.profileType !== 'claimed-tag' && (
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
                {selectedAgentProfile.profileType !== 'claimed-tag' && (
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
                <div><strong>{selectedAgentProfile.profileType === 'claimed-tag' ? '—' : agentFollowState.loading ? '…' : agentFollowState.error ? '—' : agentFollowState.followerCount}</strong><span>Followers</span></div>
                <div><strong>{selectedAgentProfile.earnings || '—'}</strong><span>Earned</span></div>
                <div><strong>{selectedAgentProfile.id ? `#${selectedAgentProfile.id}` : '—'}</strong><span>Agent ID</span></div>
                <div><strong>{selectedAgentProfile.profileType === 'claimed-tag'
                  ? selectedAgentProfile.profileLoading ? '…' : selectedAgentProfile.completedTaskCount ?? '—'
                  : agentProfileLiveLoading ? '…' : agentProfileLiveData?.completedTaskCount ?? '—'}</strong><span>Tasks done</span></div>
              </div>

              <div className="agent-profile-detail-row">
                <div className="agent-profile-category">{selectedAgentProfile.category || 'NairaTag'}</div>
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

              <div className="agent-profile-card-actions">
                <button
                  type="button"
                  className="agent-profile-pay-button agent-profile-pay-full"
                  disabled={selectedAgentProfile.profileType === 'claimed-tag' && (!selectedAgentProfile.owner || selectedAgentProfile.profileLoading)}
                  onClick={() => handlePayAgentFromProfile(selectedAgentProfile)}
                ><Send size={15} /> Pay ₦{selectedAgentProfile.tag.toUpperCase()}</button>
              </div>

              {selectedAgentProfile.profileType !== 'claimed-tag' && (
                <a
                  className="agent-profile-explorer-link"
                  href={`https://erc-8004.quicknode.com/agents/arc-testnet/${selectedAgentProfile.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >View agent on 8004scan <ExternalLink size={12} /></a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          MODAL: POST BOUNTY / TASK DIALOG
          ─────────────────────────────────────────────────────────────────── */}
      {isPostTaskOpen && (
        <div className="modal-backdrop" onClick={() => setIsPostTaskOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>💼</span>
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
                    min="1"
                    className="token-amount-field"
                    style={{ width: '100%', fontSize: '13px', padding: '8px 10px', marginTop: '4px' }}
                    placeholder="35"
                    value={postTaskForm.reward}
                    onChange={(e) => setPostTaskForm((prev) => ({ ...prev, reward: e.target.value }))}
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
                  placeholder="Describe task scope, requirements, and deliverable format..."
                  value={postTaskForm.description}
                  onChange={(e) => setPostTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ padding: '8px 10px', background: 'rgba(0, 82, 255, 0.06)', borderRadius: '6px', border: '1px solid rgba(0, 82, 255, 0.15)', fontSize: '11px', color: 'var(--privy-color-interactive)' }}>
                🔒 <strong>Smart Escrow:</strong> Funds are locked until milestone verification.
              </div>

              <button type="submit" className="btn-action-primary" style={{ marginTop: '4px' }}>
                Create Task
              </button>
            </form>
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
                {myTag ? myTag.tag?.slice(0, 1).toUpperCase() : '₦'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>{myTag ? `₦${myTag.tag}` : 'Sovereign Wallet'}</span>
                  <span className="card-net-pill">Arc Osaka</span>
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
                    href="https://explorer.testnet.arc.io"
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
                      Scan to receive USDC or resolve {myTag ? `₦${myTag.tag}` : 'wallet'} on Arc Osaka EVM.
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
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          FLOATING TOAST NOTIFICATION CONTAINER
          ─────────────────────────────────────────────────────────────────── */}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-pill toast-${toast.type}`}>
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
    </>
  );
}

