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
  checkTagAvailability,
  getTagForWallet,
  normalizeTag,
  claimTag,
} from './services/nairatagResolver.js';
import {
  registerAiAgent,
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
import confetti from 'canvas-confetti';
import RewardsPage, { GoldenVoucherModal, LuckyWheelModal, ReferralModal } from './RewardsPage.jsx';
import NotificationLayer from './components/NotificationLayer.jsx';
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

  // Navigation: 'pay' (Home) | 'claim' | 'tasks' | 'agents' | 'chat' | 'faq' | 'rewards'
  const VALID_TABS = ['pay', 'claim', 'tasks', 'agents', 'chat', 'faq', 'rewards'];
  const [mainTab, setMainTabState] = useState(() => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash)) {
        return hash;
      }
    } catch { }
    return 'pay';
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
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'm1',
      sender: 'agent',
      agentTag: 'ArcAgent',
      agentName: 'Arc Sovereign Agent',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=arc-agent',
      text: "Welcome to Sovereign Agent Chat on Arc Osaka EVM! I can execute gasless USDC payments, lock milestone bounties in smart contract escrow, or collaborate directly with verified ERC-8004 agents. Type '@' or click below to tag an agent.",
      time: 'Just now',
      widget: null,
    },
    {
      id: 'm2',
      sender: 'agent',
      agentTag: 'dev',
      agentName: 'Arc Contract Auditor',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=dev',
      text: "⚡ Tag me with @₦dev to audit contracts, verify bytecode, or establish automated multi-party escrow contracts on Arc Osaka.",
      time: 'Just now',
      widget: {
        type: 'contract_audit',
        title: 'Solidity & Bytecode Verifier',
        badge: 'Osaka Guard',
        body: 'Verified 5 smart contracts this week. Gas optimization: 99.8%. Ready for milestone deployment on Arc Osaka.',
        actionText: 'Request Contract Audit',
        actionPrompt: '@₦dev Audit my Arc milestone escrow contract',
      }
    }
  ]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatIsTyping, setChatIsTyping] = useState(false);
  const [currentTaggedAgent, setCurrentTaggedAgent] = useState(null);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

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

  const handleSendChatPrompt = (customPrompt = null) => {
    const textToSend = (customPrompt !== null ? customPrompt : chatInputText).trim();
    if (!textToSend) return;

    const userMsgId = 'usr-' + Date.now();
    const newMsg = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      widget: null,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    if (customPrompt === null) {
      setChatInputText('');
    }
    setChatIsTyping(true);

    setTimeout(() => {
      const lower = textToSend.toLowerCase();
      let replyText = '';
      let replyAgentTag = currentTaggedAgent ? currentTaggedAgent.tag : 'ArcAgent';
      let replyAgentName = currentTaggedAgent ? currentTaggedAgent.name : 'Arc Sovereign Agent';
      let replyAvatar = currentTaggedAgent
        ? currentTaggedAgent.avatar
        : 'https://api.dicebear.com/7.x/identicon/svg?seed=arc-agent';
      let widget = null;

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

      if (replyAgentTag === 'chowdeck' || lower.includes('food') || lower.includes('chowdeck') || lower.includes('jollof') || lower.includes('order')) {
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
      } else if (lower.includes('send') || lower.includes('pay') || lower.includes('usdc')) {
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
        replyText = `Understood! I've logged your request: "${textToSend}". You can tag any verified agent with @₦tag to collaborate or delegate onchain tasks.`;
        widget = {
          type: 'agent_info',
          title: `${replyAgentName} Profile`,
          badge: 'ERC-8004 Registered',
          body: 'Autonomous AI agent verified on Arc Osaka. Ready to accept micro-payments and bounties.',
          actionText: `Dispatch Task to ₦${replyAgentTag}`,
          actionPrompt: `@₦${replyAgentTag} Execute task on Arc Osaka`,
        };
      }

      const botReply = {
        id: 'bot-' + Date.now(),
        sender: 'agent',
        agentTag: replyAgentTag,
        agentName: replyAgentName,
        avatar: replyAvatar,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        widget: widget,
      };

      setChatMessages((prev) => [...prev, botReply]);
      setChatIsTyping(false);
    }, 700);
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
  const [userPoints, setUserPoints] = useState(380);
  const [completedTaskIds, setCompletedTaskIds] = useState(['b001']);
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

  // Agent Chat (Muse Spark AI) State
  const [agentChatMessages, setAgentChatMessages] = useState({});
  const [agentChatInput, setAgentChatInput] = useState('');

  const allTasks = useMemo(() => {
    return [...customTasks, ...DEFAULT_TASKS];
  }, [customTasks]);

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
  const [claimCardMode, setClaimCardMode] = useState('identity'); // 'identity' | 'share' | 'referral' | 'qrcode'

  const activeCleanTag = useMemo(() => {
    return claimInput.replace(/^[$₦]/, '').trim() || (myTag ? myTag.tag?.replace(/^[$₦]/, '') : 'TAG');
  }, [claimInput, myTag]);

  // Dynamic live mascot for claim input searchbar (updates in real-time as user types)
  const liveMascotProfile = useMemo(() => {
    const clean = claimInput.replace(/^[$₦]/, '').trim().toLowerCase();
    return resolveTagProfile(clean || 'nairatag', { avatarSize: 34 });
  }, [claimInput]);

  // Carousel auto-advance for Recent Registrations
  useEffect(() => {
    if (mainTab !== 'claim') return;
    const interval = setInterval(() => {
      setClaimRegSlide((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [mainTab]);

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
  const [agentProfileTab, setAgentProfileTab] = useState('overview'); // 'overview' | 'share' | 'refer' | 'qr'
  const [agentProfileLiveLoading, setAgentProfileLiveLoading] = useState(false);
  const [agentProfileLiveData, setAgentProfileLiveData] = useState(null);

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
      const avail = await checkTagAvailability(clean);
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

  // Balance refresh
  const refreshBalance = useCallback(async (address) => {
    if (!address) return;
    setBalanceLoading(true);
    try {
      const bal = await getUsdcBalance(address);
      setUsdcBalance(bal);
      const tag = await getTagForWallet(address);
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

  // Tasks & Bounties Handlers
  const handleApplyOrCompleteTask = (task) => {
    if (completedTaskIds.includes(task.id)) {
      showToast(`Already claimed quest: ${task.title}`, 'info');
      return;
    }
    setCompletedTaskIds((prev) => [...prev, task.id]);
    const earnedPoints = task.points || 200;
    setUserPoints((prev) => prev + earnedPoints);
    triggerCelebrationConfetti();
    showToast(`🎉 Quest completed! +${earnedPoints} Protocol Points & ${task.rewardUSDC} USDC reward queued!`, 'success', 3500);
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
      showToast(`Payment sent: ${amountInput} USDC`, 'success', 3500);

      // Web Push & In-App notification with tactile coin chime
      sendNotificationAlert({
        title: '⚡ Payment Finalized on Arc!',
        body: `Sent ${amountInput} USDC to ${targetTag ? `₦${targetTag.replace(/^[$₦]/, '').toUpperCase()}` : shorten(result.recipientAddress)} in ${result.executionTimeMs || '<1'}s. +1 Lucky Spin earned!`,
        type: 'cash',
        actionLabel: 'Spin Wheel 🎡',
        url: '/#rewards',
      });

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
      showToast(`Swap completed: ${swapAmountIn} ${swapTokenIn} ➔ ${swapEstimate?.amountOut || ''} ${swapTokenOut}`, 'success', 4000);
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
    setAgentProfileTab('overview');
    setAgentProfileLiveLoading(true);
    setAgentProfileLiveData(null);
    try {
      const details = await getAgentDetails(agent.id);
      let logs = [];
      try {
        logs = await getAgentReputationLogs(agent.id);
      } catch (logErr) {
        console.warn('Reputation logs note:', logErr);
      }
      setAgentProfileLiveData({ details, logs });
    } catch (e) {
      console.warn('Live agent query note:', e.message);
      setAgentProfileLiveData(null);
    } finally {
      setAgentProfileLiveLoading(false);
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
      const res = await checkTagAvailability(clean);
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
      const res = await claimTag({
        tag: claimInput,
        ownerAddress: walletAddress,
      });
      triggerCelebrationConfetti();
      showToast(`₦${claimInput.replace(/^[$₦]/, '').toUpperCase()} claimed successfully on Arc!`, 'success', 4000);
      setCelebrationDetails({
        type: 'claim',
        txHash: res.txHash,
        amount: `₦${claimInput.replace(/^[$₦]/, '').toUpperCase()}`,
        recipient: 'Sovereign Onchain Tag',
        explorerUrl: `${ARC_TESTNET_CONFIG.explorerUrl}/tx/${res.txHash}`,
      });
      setIsCelebrationOpen(true);
      setIsClaimModalOpen(false);
      await refreshBalance(walletAddress);
    } catch (e) {
      showToast(`Claim failed: ${e.message}`, 'error', 4000);
      alert(`Claim failed: ${e.message}`);
    } finally {
      setIsClaiming(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleLookupAgent('1');
  }, []);

  return (
    <>
      {/* ─── Top Application Header (Reference-matched Layout) ─── */}
      <header className="app-header">
        {/* Left Side: Brand Logo Badge + Mobile Hamburger Menu */}
        <div className="app-header-left">
          <div className="app-brand" onClick={() => setMainTab('pay')}>
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
            className={`nav-tab-btn ${mainTab === 'rewards' ? 'active' : ''}`}
            onClick={() => setMainTab('rewards')}
          >
            <Gift size={14} />
            <span>Rewards</span>
            <span className="nav-badge-pill" style={{ background: '#ef4444' }}>HOT</span>
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
            className={`nav-tab-btn ${mainTab === 'claim' ? 'active' : ''}`}
            onClick={() => setMainTab('claim')}
          >
            <Sparkles size={14} />
            <span>Claim ₦Tag</span>
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
            className={`nav-tab-btn ${mainTab === 'faq' ? 'active' : ''}`}
            onClick={() => setMainTab('faq')}
          >
            <HelpCircle size={14} />
            <span>FAQ</span>
          </button>
        </nav>

        {/* Right Side: Search Icon + More (···) + Connect Pill */}
        <div className="app-header-actions">
          {/* Search Button */}
          <button
            type="button"
            className="header-icon-btn search-trigger-btn"
            onClick={() => setIsMobileSearchOpen(true)}
            aria-label="Search tags or agents"
            title="Search"
          >
            <Search size={20} />
          </button>

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

                  <a
                    href="https://explorer.testnet.arc.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <ExternalLink size={15} />
                    <span>ArcScan Explorer ↗</span>
                  </a>

                  <a
                    href="https://8004scan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="more-menu-item"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <Bot size={15} />
                    <span>8004scan (AI Agents) ↗</span>
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

          {/* Notification Bell with Badge 3 (Matching Reference Screenshot) */}
          <div className="header-bell-wrapper">
            <button
              type="button"
              className={`header-bell-btn ${isNotificationOpen ? 'active' : ''}`}
              onClick={() => {
                playMicroSound('pop');
                setIsNotificationOpen(!isNotificationOpen);
              }}
              aria-label="3 new notifications"
              title="Notifications"
            >
              <Bell size={18} className={isNotificationOpen ? 'bell-ringing-active' : ''} />
              <span className="header-bell-badge">3</span>
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
                    <span className="nav-badge-pill" style={{ background: '#ef4444' }}>3 New</span>
                  </div>

                  <div className="notifications-list">
                    <div
                      className="notification-item unread"
                      onClick={() => {
                        setIsNotificationOpen(false);
                        setIsGoldenVoucherOpen(true);
                      }}
                    >
                      <div className="notif-dot" />
                      <div className="notif-content">
                        <div className="notif-title">🎁 Golden Voucher Pack Available!</div>
                        <div className="notif-sub">Claim up to 50% transaction discounts & airtime bonus</div>
                      </div>
                    </div>

                    <div
                      className="notification-item unread"
                      onClick={() => {
                        setMainTab('agents');
                        setIsNotificationOpen(false);
                      }}
                    >
                      <div className="notif-dot" />
                      <div className="notif-content">
                        <div className="notif-title">🤖 ₦chowdeck Settled on Arc</div>
                        <div className="notif-sub">Sub-second USDC micro-payment finality verified</div>
                      </div>
                    </div>

                    <div
                      className="notification-item unread"
                      onClick={() => {
                        setMainTab('tasks');
                        setIsNotificationOpen(false);
                      }}
                    >
                      <div className="notif-dot" />
                      <div className="notif-content">
                        <div className="notif-title">🔒 Escrow Milestone #b001 Verified</div>
                        <div className="notif-sub">Arc Osaka smart escrow locked $120 USDC</div>
                      </div>
                    </div>
                  </div>

                  {/* Web Push & In-App Alert Quick Test Action */}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color, rgba(0,0,0,0.08))', background: 'rgba(0,0,0,0.02)' }}>
                    <button
                      type="button"
                      className="shimmer-sweep"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                      onClick={() => {
                        sendNotificationAlert({
                          title: '⚡ Web Push & In-App Alert Live!',
                          body: 'VAPID push subscription active. Instant transaction and reward updates ready.',
                          type: 'reward',
                          actionLabel: 'Claim Voucher 🎁',
                          url: '/#rewards',
                        });
                        setIsNotificationOpen(false);
                      }}
                    >
                      <span>🔔</span>
                      <span>Test Push &amp; In-App Alert</span>
                    </button>
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
                  <span className="mobile-nav-desc">Lucky Wheel, cashback, airtime vouchers &amp; referral</span>
                </div>
                <span className="nav-badge-pill" style={{ background: '#ef4444' }}>HOT</span>
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
                  <span className="mobile-nav-title">FAQ</span>
                  <span className="mobile-nav-desc">Protocol knowledge base & quick answers</span>
                </div>
                {mainTab === 'faq' && <span className="mobile-nav-active-pill">Active</span>}
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
      <main className="main-content-wrapper">
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
                    <button
                      type="button"
                      className="btn-claimed-action"
                      onClick={() => triggerCopy('my_tag', `₦${myTag.tag?.replace(/^[$₦]/, '').toUpperCase()}`)}
                    >
                      {copiedKey === 'my_tag' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Center Stage: Live Type Tag Searching Display */}
                <div className="claim-hero-stage">
                  <div className="claim-stage-subtitle">Claim your NairaTag</div>
                  <div
                    className={`claim-live-tag-display ${claimInput.trim() ? 'has-value' : ''}`}
                    onClick={() => {
                      const input = document.getElementById('claim-tag-input-field');
                      if (input) input.focus();
                    }}
                    title="Click to search / edit tag"
                  >
                    <span className="live-tag-prefix">₦</span>
                    <span>{claimInput.replace(/^[$₦]/, '').toUpperCase() || 'Tag'}</span>
                  </div>
                </div>

                {/* Pill Input Box with Inline Status Pill */}
                <div className="claim-pill-input-box">
                  <input
                    id="claim-tag-input-field"
                    type="text"
                    className="claim-pill-input"
                    placeholder="Enter your NairaTag"
                    autoComplete="off"
                    spellCheck="false"
                    aria-label="Enter your NairaTag"
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
                      <span>Claiming on Arc...</span>
                    </>
                  ) : (
                    <span>Claim ₦{claimInput.replace(/^[$₦]/, '').toUpperCase() || 'TAG'}</span>
                  )}
                </button>
              </div>

              {/* Recent Registrations Animated Carousel (3 pills per slide) */}
              <div className="reg-carousel-container">
                <div
                  className="reg-carousel-track"
                  style={{ transform: `translateX(-${claimRegSlide * 100}%)` }}
                >
                  {/* Slide 1 */}
                  <div className="reg-slide">
                    {[
                      { tag: 'segun', net: 'Arc' },
                      { tag: 'dev', net: 'Arc' },
                      { tag: 'mama', net: 'Arc' },
                    ].map((item) => (
                      <div
                        key={item.tag}
                        className="reg-pill-item"
                        onClick={() => handleCheckClaim(item.tag)}
                        title={`₦${item.tag} · Arc Testnet`}
                      >
                        <img
                          className="reg-dicebear-avatar"
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.tag}`}
                          alt={`₦${item.tag}`}
                          onError={(e) => {
                            e.currentTarget.src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%2310b981"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="11" font-weight="bold">₦</text></svg>';
                          }}
                        />
                        <span className="reg-handle-tag">₦{item.tag}</span>
                        <span className="reg-net-mini">{item.net}</span>
                      </div>
                    ))}
                  </div>

                  {/* Slide 2 */}
                  <div className="reg-slide">
                    {[
                      { tag: 'chowdeck', net: 'Arc' },
                      { tag: 'shop', net: 'Arc' },
                      { tag: 'travel', net: 'Arc' },
                    ].map((item) => (
                      <div
                        key={item.tag}
                        className="reg-pill-item"
                        onClick={() => handleCheckClaim(item.tag)}
                        title={`₦${item.tag} · Arc Testnet`}
                      >
                        <img
                          className="reg-dicebear-avatar"
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.tag}`}
                          alt={`₦${item.tag}`}
                          onError={(e) => {
                            e.currentTarget.src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%2310b981"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="11" font-weight="bold">₦</text></svg>';
                          }}
                        />
                        <span className="reg-handle-tag">₦{item.tag}</span>
                        <span className="reg-net-mini">{item.net}</span>
                      </div>
                    ))}
                  </div>

                  {/* Slide 3 */}
                  <div className="reg-slide">
                    {[
                      { tag: 'designer', net: 'Arc' },
                      { tag: 'researcher', net: 'Arc' },
                      { tag: 'bayo', net: 'Arc' },
                    ].map((item) => (
                      <div
                        key={item.tag}
                        className="reg-pill-item"
                        onClick={() => handleCheckClaim(item.tag)}
                        title={`₦${item.tag} · Arc Testnet`}
                      >
                        <img
                          className="reg-dicebear-avatar"
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.tag}`}
                          alt={`₦${item.tag}`}
                          onError={(e) => {
                            e.currentTarget.src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%2310b981"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="11" font-weight="bold">₦</text></svg>';
                          }}
                        />
                        <span className="reg-handle-tag">₦{item.tag}</span>
                        <span className="reg-net-mini">{item.net}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slide Pagination Dots */}
                <div className="reg-dots-nav">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`reg-dot-btn ${claimRegSlide === idx ? 'active' : ''}`}
                      onClick={() => setClaimRegSlide(idx)}
                      title={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
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
            {/* Top Bar: Search and Grid/List View Toggle */}
            <div className="agents-top-bar">
              <div className="agents-top-controls" style={{ width: '100%', justifyContent: 'space-between' }}>
                {/* Search Bar */}
                <div className="agents-search-input-wrap" style={{ flex: 1, maxWidth: '420px' }}>
                  <Search size={14} color="var(--privy-color-foreground-3)" />
                  <input
                    type="text"
                    className="agents-search-input"
                    placeholder="Search bounties, skills, or tags..."
                    value={tasksSearch}
                    onChange={(e) => setTasksSearch(e.target.value)}
                  />
                  {tasksSearch && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--privy-color-foreground-3)' }}
                      onClick={() => setTasksSearch('')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Grid / List Switcher + Create Task Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="agents-view-toggle">
                    <button
                      type="button"
                      className={`view-toggle-btn ${tasksViewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setTasksViewMode('grid')}
                      title="Grid View"
                      aria-label="Grid View"
                    >
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn ${tasksViewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setTasksViewMode('list')}
                      title="List View"
                      aria-label="List View"
                    >
                      <List size={15} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-agent-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                    onClick={() => setIsPostTaskOpen(true)}
                  >
                    <Plus size={14} />
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
                <span className="agents-stat-card-label">Escrow Locked</span>
                <span className="agents-stat-card-value">$14,250</span>
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
                  <div style={{ gridColumn: '1 / -1', padding: '36px 16px', textAlign: 'center', background: 'var(--surface1, #ffffff)', borderRadius: 'var(--radius-card, 24px)', border: '1px dashed var(--border-color, rgba(0,0,0,0.12))' }}>
                    <Briefcase size={28} color="var(--privy-color-foreground-2)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>No bounties match your filter</div>
                    <div style={{ fontSize: '12px', color: 'var(--privy-color-foreground-2)', marginTop: '4px' }}>
                      Try searching for different keywords or post the first bounty in this category!
                    </div>
                  </div>
                ) : (
                  filteredTasks.map((task, idx) => {
                    const isDone = completedTaskIds.includes(task.id);
                    const rankLabel = task.rank || `#${idx + 1}`;
                    return (
                      <div
                        key={task.id}
                        className="agent-milestone-card"
                        onClick={() => handleApplyOrCompleteTask(task)}
                        style={{ cursor: isDone ? 'default' : 'pointer' }}
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
                            {isDone ? 'Claimed' : `$${task.rewardUSDC} USDC`}
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
                  <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface1, #ffffff)', borderRadius: 'var(--radius-card, 24px)', border: '1px dashed var(--border-color, rgba(0,0,0,0.12))' }}>
                    <Briefcase size={28} color="var(--privy-color-foreground-2)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>No bounties match your filter</div>
                  </div>
                ) : (
                  filteredTasks.map((task, idx) => {
                    const isDone = completedTaskIds.includes(task.id);
                    const rankLabel = task.rank || `#${idx + 1}`;
                    const rankTopClass = idx === 0 ? 'rank-top1' : idx === 1 ? 'rank-top2' : idx === 2 ? 'rank-top3' : '';
                    return (
                      <div
                        key={task.id}
                        className="agent-circle-row"
                        onClick={() => handleApplyOrCompleteTask(task)}
                        style={{ cursor: isDone ? 'default' : 'pointer' }}
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
                              {isDone ? 'Claimed' : `$${task.rewardUSDC} USDC`}
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

            {/* Post / Create Escrow Bounty Bottom Card (Matching "Deploy Your Autonomous Agent" on Agents page) */}
            <div className="agents-top-bar" style={{ marginTop: '8px' }}>
              <div className="agents-top-left">
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--privy-color-foreground)' }}>
                  Post a Sovereign Escrow Bounty
                </div>
                <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)' }}>
                  Lock USDC on Arc Osaka EVM with automated milestone payouts to verified ₦Tags.
                </div>
              </div>
              <button
                type="button"
                className="btn-agent-primary"
                style={{ flex: 'none', padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setIsPostTaskOpen(true)}
              >
                <Plus size={14} />
                <span>+ Post Bounty</span>
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 4: SOVEREIGN AGENT CHAT (TAG2TAG LAYER & TASK DISPATCH)
            ─────────────────────────────────────────────────────────────────── */}
        {mainTab === 'chat' && (
          <div className="chat-page-container">
            {/* Minimal Chat Top Navigation Bar */}
            <div className="chat-top-nav-bar">
              <button
                type="button"
                className="chat-back-btn"
                onClick={() => setMainTab('pay')}
                aria-label="Back to Home"
              >
                <ArrowLeft size={16} />
                <span>Home</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--privy-color-foreground)' }}>
                  {currentTaggedAgent ? `₦${currentTaggedAgent.tag}` : 'Sovereign Agent'}
                </span>
                <span className="card-net-pill" style={{ fontSize: '9px', padding: '1px 6px' }}>Arc Osaka</span>
              </div>
              <button
                type="button"
                className="chat-top-tag-btn"
                onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                title="Tag Agent"
              >
                <AtSign size={13} />
                <span>Tag</span>
              </button>
            </div>

            {/* Message Stream */}
            <div className="chat-stream-card">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-msg-row ${msg.sender}`}>
                  <div className={`chat-msg-avatar ${msg.sender}`}>
                    {msg.sender === 'user' ? (
                      <User size={16} />
                    ) : msg.avatar ? (
                      <img src={msg.avatar} alt={msg.agentName} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                  <div className="chat-msg-content">
                    {msg.sender === 'agent' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground-2)' }}>
                        <span>{msg.agentName}</span>
                        <span style={{ color: '#059669', fontSize: '10.5px' }}>₦{msg.agentTag}</span>
                      </div>
                    )}
                    <div className="chat-msg-bubble">
                      {msg.text}
                    </div>

                    {/* Generative Interactive Task Widget */}
                    {msg.widget && (
                      <div className="chat-widget-box">
                        <div className="chat-widget-header">
                          <div className="chat-widget-title">
                            <Sparkles size={14} color="#7C3AED" />
                            <span>{msg.widget.title}</span>
                          </div>
                          <span className="chat-widget-badge">{msg.widget.badge}</span>
                        </div>
                        <div className="chat-widget-body">
                          {msg.widget.body}
                        </div>
                        <div className="chat-widget-actions">
                          <button
                            type="button"
                            className="btn-agent-primary"
                            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => handleWidgetAction(msg.widget)}
                          >
                            <Zap size={13} />
                            <span>{msg.widget.actionText}</span>
                          </button>
                          {msg.widget.targetTag && (
                            <button
                              type="button"
                              className="btn-agent-secondary"
                              style={{ padding: '6px 12px', fontSize: '11px' }}
                              onClick={() => {
                                setRecipientInput(msg.widget.targetTag);
                                setMainTab('pay');
                              }}
                            >
                              <span>Open in Swap</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="chat-msg-time">{msg.time}</div>
                  </div>
                </div>
              ))}

              {chatIsTyping && (
                <div className="chat-msg-row agent">
                  <div className="chat-msg-avatar agent">
                    <Bot size={16} />
                  </div>
                  <div className="chat-msg-content">
                    <div className="chat-msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', animation: 'pulse 1s infinite' }} />
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', animation: 'pulse 1s 0.2s infinite' }} />
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', animation: 'pulse 1s 0.4s infinite' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Composer Card */}
            <div className="chat-composer-card">
              {/* Popover for Tagging Agent */}
              {isTagPopoverOpen && (
                <div className="agent-tag-popover">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.08))' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>Tag Verified Agent</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                      onClick={() => setIsTagPopoverOpen(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search agents by tag..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, rgba(0,0,0,0.15))',
                      background: 'var(--background, #f9fafb)',
                      color: 'var(--privy-color-foreground)',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                    {VERIFIED_AGENTS
                      .filter((a) => !tagSearchQuery || a.tag.toLowerCase().includes(tagSearchQuery.toLowerCase()) || a.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                      .map((agent) => (
                        <div
                          key={agent.tag}
                          className="agent-tag-popover-item"
                          onClick={() => handleSelectAgentTag(agent)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={agent.avatar} alt={agent.name} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                            <div>
                              <div className="agent-tag-popover-tag">₦{agent.tag}</div>
                              <div className="agent-tag-popover-role">{agent.role.slice(0, 32)}...</div>
                            </div>
                          </div>
                          <ChevronRight size={14} color="var(--privy-color-foreground-3)" />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Tag Context Bar (when an agent is selected) */}
              {currentTaggedAgent && (
                <div className="chat-tag-context-bar">
                  <div className="chat-tag-context-left">
                    <span style={{ background: '#059669', color: '#FFF', borderRadius: '4px', padding: '2px 5px', fontSize: '10px' }}>
                      TAGGED
                    </span>
                    <span>@₦{currentTaggedAgent.tag}</span>
                    <span style={{ opacity: 0.7, fontWeight: 400, fontSize: '11px' }}>({currentTaggedAgent.name})</span>
                  </div>

                  {/* Quick Task Action Chips for Tagged Agent */}
                  <div className="chat-tag-chips-scroll">
                    {currentTaggedAgent.tag === 'chowdeck' && (
                      <>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦chowdeck Order Jollof Rice & Turkey delivery for 4.5 USDC`)}
                        >
                          🍗 Order Jollof (4.5 USDC)
                        </button>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦chowdeck Check active food delivery status on Arc`)}
                        >
                          ⚡ Order Status
                        </button>
                      </>
                    )}

                    {currentTaggedAgent.tag === 'dev' && (
                      <>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦dev Audit bytecode of milestone escrow smart contract`)}
                        >
                          ⚡ Audit Bytecode
                        </button>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦dev Deploy Osaka-optimized escrow with zero gas sponsorship`)}
                        >
                          🛡️ Deploy Escrow
                        </button>
                      </>
                    )}

                    {currentTaggedAgent.tag === 'designer' && (
                      <>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦designer Generate UI brand pack and milestone deliverables`)}
                        >
                          🎨 Generate UI Pack
                        </button>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦designer Release 25 USDC milestone reward for vector icons`)}
                        >
                          💰 Release 25 USDC
                        </button>
                      </>
                    )}

                    {currentTaggedAgent.tag === 'ride' && (
                      <>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦ride Dispatch autonomous transit from Mainland to Island`)}
                        >
                          🚖 Dispatch Ride (3.2 USDC)
                        </button>
                      </>
                    )}

                    {currentTaggedAgent.tag === 'escrow' && (
                      <>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦escrow Lock 10 USDC in milestone escrow for delivery guarantee`)}
                        >
                          🔒 Lock 10 USDC Escrow
                        </button>
                      </>
                    )}

                    {currentTaggedAgent.tag === 'food' && (
                      <>
                        <button
                          type="button"
                          className="chat-tag-chip-btn"
                          onClick={() => handleSendChatPrompt(`@₦food Redeem P2P food pantry voucher on Arc Osaka`)}
                        >
                          🍲 Redeem Voucher
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="chat-tag-context-clear"
                      onClick={handleClearTaggedAgent}
                      title="Clear Tag"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Input Row */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatPrompt();
                }}
                className="chat-input-row"
              >
                <button
                  type="button"
                  className="chat-tag-agent-btn"
                  onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                  title="Tag an Agent"
                >
                  <AtSign size={14} />
                  <span>Tag</span>
                </button>

                <input
                  type="text"
                  className="chat-composer-input"
                  placeholder={
                    currentTaggedAgent
                      ? `Message @₦${currentTaggedAgent.tag} or ask them to perform a task...`
                      : "Chat with your sovereign agent, send USDC, or tag @₦dev, @₦chowdeck..."
                  }
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                />

                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!chatInputText.trim() || chatIsTyping}
                  aria-label="Send Message"
                >
                  <Send size={16} />
                </button>
              </form>

              {/* Suggested Agent Pills */}
              {!currentTaggedAgent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingTop: '2px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--privy-color-foreground-3)', whiteSpace: 'nowrap' }}>
                    Tag verified bot:
                  </span>
                  {VERIFIED_AGENTS.map((agent) => (
                    <button
                      key={agent.tag}
                      type="button"
                      className="chat-tag-chip-btn"
                      onClick={() => handleSelectAgentTag(agent)}
                    >
                      <img src={agent.avatar} alt={agent.name} style={{ width: 14, height: 14, borderRadius: '50%' }} />
                      <span>@₦{agent.tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            userTag={userTag}
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
          {/* 0. Rewards (with Coral-Red Notification Badge) */}
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

          {/* 1. Tasks */}
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

          {/* 2. Agents (with Purple Pill Badge "8") */}
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

          {/* 3. Claim */}
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
              {celebrationDetails.type === 'claim' && `Sovereign Tag Claimed: ${celebrationDetails.amount}`}
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
            </div>

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
              {isClaiming ? 'Claiming on Arc...' : 'Confirm & Claim ₦Tag'}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          MODAL 4: AGENT PROFILE POPUP (GROUNDED IN USER REFERENCES)
          ─────────────────────────────────────────────────────────────────── */}
      {selectedAgentProfile && (
        <div className="agent-modal-backdrop" onClick={() => setSelectedAgentProfile(null)}>
          <div className="agent-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="agent-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--privy-color-foreground)' }}>
                    {selectedAgentProfile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)', fontFamily: 'var(--font-mono)' }}>
                    Arc ERC-8004 Token #{selectedAgentProfile.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="agent-modal-close-btn"
                onClick={() => setSelectedAgentProfile(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="agent-modal-body">
              {/* Sovereign Passport Preview Banner */}
              <div className="agent-passport-stage">
                <div className="agent-passport-watermark">₦</div>
                <div className="agent-passport-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900 }}>₦</span>
                    <span className="card-net-pill">Arc Osaka EVM</span>
                  </div>
                  <img
                    src="/verified-badge.png"
                    alt="Verified"
                    style={{ width: '20px', height: '20px' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                  <img
                    src={selectedAgentProfile.avatar}
                    alt={selectedAgentProfile.name}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '2px solid rgba(0,0,0,0.15)',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div className="agent-passport-handle">₦{selectedAgentProfile.tag.toUpperCase()}</div>
                    <div className="agent-passport-role">{selectedAgentProfile.role}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800 }}>Earnings: {selectedAgentProfile.earnings}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8 }}>Owner: {shorten(selectedAgentProfile.owner)}</span>
                </div>
              </div>

              {/* Mode Tabs: ✦ Overview, 🔗 Share, 🎁 Referral, 📱 QR Code */}
              <div className="agent-profile-tabs">
                <button
                  type="button"
                  className={`agent-profile-tab-btn ${agentProfileTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setAgentProfileTab('overview')}
                >
                  ✦ Overview
                </button>
                <button
                  type="button"
                  className={`agent-profile-tab-btn ${agentProfileTab === 'share' ? 'active' : ''}`}
                  onClick={() => setAgentProfileTab('share')}
                >
                  🔗 Share
                </button>
                <button
                  type="button"
                  className={`agent-profile-tab-btn ${agentProfileTab === 'refer' ? 'active' : ''}`}
                  onClick={() => setAgentProfileTab('refer')}
                >
                  🎁 Referral
                </button>
                <button
                  type="button"
                  className={`agent-profile-tab-btn ${agentProfileTab === 'qr' ? 'active' : ''}`}
                  onClick={() => setAgentProfileTab('qr')}
                >
                  📱 QR Code
                </button>
                <button
                  type="button"
                  className={`agent-profile-tab-btn ${agentProfileTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setAgentProfileTab('chat')}
                >
                  💬 Chat
                </button>
              </div>

              {/* Tab 1: OVERVIEW */}
              {agentProfileTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="agent-specs-table">
                    <div className="agent-spec-row">
                      <span className="agent-spec-label">Canonical Tag</span>
                      <span className="agent-spec-value">₦{selectedAgentProfile.tag.toUpperCase()}</span>
                    </div>
                    <div className="agent-spec-row">
                      <span className="agent-spec-label">Token ID</span>
                      <span className="agent-spec-value">#{selectedAgentProfile.id}</span>
                    </div>
                    <div className="agent-spec-row">
                      <span className="agent-spec-label">Category</span>
                      <span className="agent-spec-value" style={{ fontFamily: 'var(--font-maru)' }}>
                        {selectedAgentProfile.category}
                      </span>
                    </div>
                    <div className="agent-spec-row">
                      <span className="agent-spec-label">Owner Wallet</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="agent-spec-value">{shorten(selectedAgentProfile.owner)}</span>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => triggerCopy(`agent_owner_${selectedAgentProfile.id}`, selectedAgentProfile.owner)}
                          title="Copy Owner Address"
                        >
                          <Copy size={12} color="var(--privy-color-foreground-2)" />
                        </button>
                      </div>
                    </div>
                    <div className="agent-spec-row">
                      <span className="agent-spec-label">Metadata URI</span>
                      <span className="agent-spec-value" style={{ fontSize: '10.5px', color: 'var(--primary, #0052FF)' }}>
                        {shorten(selectedAgentProfile.metadataUri)}
                      </span>
                    </div>
                    <div className="agent-spec-row">
                      <span className="agent-spec-label">Attested Reputation</span>
                      <span className="agent-spec-value" style={{ color: '#10B981' }}>
                        {agentProfileLiveData?.logs ? `${agentProfileLiveData.logs.length} Onchain Logs` : 'Attested on Arc'}
                      </span>
                    </div>
                  </div>

                  <div className="agent-profile-actions">
                    <button
                      type="button"
                      className="btn-agent-primary"
                      onClick={() => handlePayAgentFromProfile(selectedAgentProfile)}
                    >
                      <Send size={14} />
                      <span>Pay ₦{selectedAgentProfile.tag.toUpperCase()}</span>
                    </button>
                    <a
                      href={`https://8004scan.io/agent/${selectedAgentProfile.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-agent-secondary"
                    >
                      <ExternalLink size={14} />
                      <span>8004scan ↗</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Tab 2: SHARE */}
              {agentProfileTab === 'share' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--privy-color-foreground-2)' }}>
                    Share this verified autonomous agent with your community:
                  </div>

                  <div className="share-actions-grid">
                    <button
                      type="button"
                      className="share-btn"
                      onClick={() => {
                        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          `Check out ₦${selectedAgentProfile.tag} on @NairaTag Arc Network! ERC-8004 Verified Agent #${selectedAgentProfile.id} 🤖 https://nairatag.ng/agent/${selectedAgentProfile.id}`
                        )}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <span>𝕏 Share on X</span>
                    </button>
                    <button
                      type="button"
                      className="share-btn"
                      onClick={() => {
                        const url = `https://t.me/share/url?url=${encodeURIComponent(`https://nairatag.ng/agent/${selectedAgentProfile.id}`)}&text=${encodeURIComponent(`Check out ₦${selectedAgentProfile.tag} - ERC-8004 Agent on Arc`)}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <span>✈️ Telegram</span>
                    </button>
                    <button
                      type="button"
                      className="share-btn"
                      onClick={() => {
                        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ₦${selectedAgentProfile.tag} on NairaTag Arc: https://nairatag.ng/agent/${selectedAgentProfile.id}`)}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <span>💬 WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      className="share-btn"
                      onClick={() => triggerCopy(`share_agent_${selectedAgentProfile.id}`, `https://nairatag.ng/agent/${selectedAgentProfile.id}`)}
                    >
                      <span>{copiedKey === `share_agent_${selectedAgentProfile.id}` ? '✓ Copied Link' : '🔗 Copy Direct Link'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: REFER & PAY */}
              {agentProfileTab === 'refer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--privy-color-foreground-2)', lineHeight: 1.4 }}>
                    Invite users to interact with ₦{selectedAgentProfile.tag.toUpperCase()}. Earn onchain protocol referral points on every Arc settlement!
                  </div>

                  <div className="referral-link-box">
                    <span className="referral-link-text">
                      {`https://nairatag.ng/claim?ref=₦${selectedAgentProfile.tag}`}
                    </span>
                    <button
                      type="button"
                      className="referral-copy-btn"
                      onClick={() => triggerCopy(`refer_agent_${selectedAgentProfile.id}`, `https://nairatag.ng/claim?ref=₦${selectedAgentProfile.tag}`)}
                    >
                      {copiedKey === `refer_agent_${selectedAgentProfile.id}` ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-agent-primary"
                    style={{ width: '100%', marginTop: '4px' }}
                    onClick={() => handlePayAgentFromProfile(selectedAgentProfile)}
                  >
                    <Send size={14} />
                    <span>Send Payment to ₦{selectedAgentProfile.tag.toUpperCase()}</span>
                  </button>
                </div>
              )}

              {/* Tab 4: QR CODE */}
              {agentProfileTab === 'qr' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`arc:${selectedAgentProfile.owner}?tag=₦${selectedAgentProfile.tag.toUpperCase()}`)}`}
                      alt="Agent QR Code"
                      style={{ width: '160px', height: '160px', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--privy-color-foreground-2)', textAlign: 'center' }}>
                    Scan with any EVM or Arc camera to resolve ₦{selectedAgentProfile.tag.toUpperCase()} instantly.
                  </div>
                  <button
                    type="button"
                    className="share-btn"
                    style={{ width: '100%' }}
                    onClick={() => triggerCopy(`agent_qr_uri_${selectedAgentProfile.id}`, `arc:${selectedAgentProfile.owner}?tag=₦${selectedAgentProfile.tag.toUpperCase()}`)}
                  >
                    <span>{copiedKey === `agent_qr_uri_${selectedAgentProfile.id}` ? '✓ Copied URI' : '📋 Copy Resolver URI'}</span>
                  </button>
                </div>
              )}

              {/* Tab 5: INTERACTIVE AI AGENT CHAT */}
              {agentProfileTab === 'chat' && (
                <div className="agent-chat-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--privy-color-background-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--privy-color-border-subtle)', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--privy-color-foreground)' }}>Online on Arc Osaka</span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--privy-color-foreground-2)', fontFamily: 'var(--font-mono)' }}>ERC-8004 #{selectedAgentProfile.id}</span>
                  </div>

                  {/* Suggestion Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {[
                      'Send 10 USDC',
                      'What are your services?',
                      'Check reputation score',
                      'How do I claim a ₦Tag?',
                    ].map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        className="quick-chip-btn"
                        style={{ fontSize: '10.5px', padding: '3px 8px' }}
                        onClick={() => handleSendAgentChat(selectedAgentProfile.id, prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Messages scroll area */}
                  <div className="agent-chat-messages" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', background: 'var(--privy-color-background-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--privy-color-border-subtle)' }}>
                    {(agentChatMessages[selectedAgentProfile.id] || [
                      {
                        sender: 'agent',
                        text: `Hello! I am ${selectedAgentProfile.name} (₦${selectedAgentProfile.tag.toUpperCase()}), verified under Arc ERC-8004 (#${selectedAgentProfile.id}). How can I assist you with autonomous tasks, escrow milestones, or micro-settlements on Arc Osaka EVM?`,
                        time: 'Just now'
                      }
                    ]).map((msg, mIdx) => (
                      <div
                        key={mIdx}
                        className={`agent-chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'agent-bubble'}`}
                        style={{
                          alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          padding: '7px 10px',
                          borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          background: msg.sender === 'user' ? 'var(--privy-color-interactive)' : 'var(--privy-color-background-surface)',
                          color: msg.sender === 'user' ? '#ffffff' : 'var(--privy-color-foreground)',
                          fontSize: '11.5px',
                          lineHeight: 1.4,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div>{msg.text}</div>
                        <div style={{ fontSize: '9px', opacity: 0.7, textAlign: 'right', marginTop: '2px' }}>{msg.time}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chat input row */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAgentChat(selectedAgentProfile.id);
                    }}
                    style={{ display: 'flex', gap: '6px', marginTop: '8px' }}
                  >
                    <input
                      type="text"
                      className="token-amount-field"
                      style={{ flex: 1, fontSize: '12px', padding: '7px 10px' }}
                      placeholder={`Ask ₦${selectedAgentProfile.tag.toUpperCase()}...`}
                      value={agentChatInput}
                      onChange={(e) => setAgentChatInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn-action-primary"
                      style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      disabled={!agentChatInput.trim()}
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
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
                🔒 <strong>Smart Escrow Guarantee:</strong> Bounty funds are locked in the Arc Osaka escrow smart contract and released deterministically upon milestone verification.
              </div>

              <button type="submit" className="btn-action-primary" style={{ marginTop: '4px' }}>
                Lock in Escrow & Publish Bounty
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
        onClaimSuccess={() => {
          showToast('Golden Voucher Pack Claimed! +2 vouchers added.', 'success');
        }}
      />

      <LuckyWheelModal
        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        availableSpins={2}
        onWinPrize={(prize) => {
          showToast(`Won ${prize.label}! Credited to your account.`, 'success');
        }}
      />

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        userTag={userTag}
      />

      {/* ───────────────────────────────────────────────────────────────────
          WEB PUSH & IN-APP NOTIFICATION LAYER (VAPID INTEGRATION)
          ─────────────────────────────────────────────────────────────────── */}
      <NotificationLayer
        onNavigateTab={setMainTab}
        onOpenRewards={() => {
          setMainTab('rewards');
          setIsGoldenVoucherOpen(true);
        }}
      />
    </>
  );
}

