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

  // Navigation: 'pay' | 'claim' | 'agents' | 'faq'
  const [mainTab, setMainTab] = useState('pay');

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

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSendReviewModalOpen, setIsSendReviewModalOpen] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

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

  // Recipient resolution debounce
  useEffect(() => {
    const raw = recipientInput.trim();
    if (!raw) {
      setResolution({ loading: false, data: null, error: null });
      return;
    }

    const timer = setTimeout(async () => {
      setResolution({ loading: true, data: null, error: null });
      try {
        const res = await resolveTag(raw);
        setResolution({ loading: false, data: res, error: null });
      } catch (err) {
        setResolution({ loading: false, data: null, error: err.message || 'Tag resolution failed' });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [recipientInput]);

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
            <div className="brand-badge" title="NairaTag on Arc">₦</div>
            <div className="brand-title-wrap desktop-only">
              <span className="brand-title">NairaTag</span>
              <span className="brand-subtitle">Send USDC on Arc to a name</span>
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
            className={`nav-tab-btn ${mainTab === 'pay' ? 'active' : ''}`}
            onClick={() => setMainTab('pay')}
          >
            <ArrowDownUp size={14} />
            <span>Swap</span>
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
            className={`nav-tab-btn ${mainTab === 'agents' ? 'active' : ''}`}
            onClick={() => setMainTab('agents')}
          >
            <Bot size={14} />
            <span>AgentTags</span>
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

          {/* Connect / Connected Wallet Pill */}
          {walletAddress ? (
            <div
              className="wallet-connected-pill"
              onClick={() => triggerCopy('header_addr', walletAddress)}
              title="Click to copy address"
            >
              <span className="wallet-connected-dot" />
              <span className="wallet-connected-handle">{myTag ? `₦${myTag.tag}` : shorten(walletAddress)}</span>
              <span className="wallet-connected-sep desktop-only">|</span>
              <span className="wallet-connected-bal desktop-only">{usdcBalance.formatted} USDC</span>
              {copiedKey === 'header_addr' && <span style={{ color: 'var(--privy-color-success-dark)', fontSize: '11px' }}>✓</span>}
            </div>
          ) : (
            <button
              type="button"
              className="wallet-btn-pill header-connect-pill"
              onClick={() => setIsConnectModalOpen(true)}
            >
              <span>Connect</span>
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
                <div className="brand-badge" style={{ width: 28, height: 28, fontSize: 15 }}>₦</div>
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

            {/* Right Sidebar: Sovereign Identity Suite & Value Pitch */}
            <aside className="claim-page-sidebar">
              {/* Card Mode Switcher Tabs */}
              <div className="card-mode-tabs" role="tablist" aria-label="Card Views">
                <button
                  type="button"
                  className={`card-mode-tab ${claimCardMode === 'identity' ? 'active' : ''}`}
                  onClick={() => setClaimCardMode('identity')}
                >
                  ✦ Identity
                </button>
                <button
                  type="button"
                  className={`card-mode-tab ${claimCardMode === 'share' ? 'active' : ''}`}
                  onClick={() => setClaimCardMode('share')}
                >
                  🔗 Share
                </button>
                <button
                  type="button"
                  className={`card-mode-tab ${claimCardMode === 'referral' ? 'active' : ''}`}
                  onClick={() => setClaimCardMode('referral')}
                >
                  🎁 Referral
                </button>
                <button
                  type="button"
                  className={`card-mode-tab ${claimCardMode === 'qrcode' ? 'active' : ''}`}
                  onClick={() => setClaimCardMode('qrcode')}
                >
                  📱 QR Code
                </button>
              </div>

              <div className="claim-sidebar-card-wrap">
                {/* VIEW 1: Live Onchain Identity Preview Card */}
                {claimCardMode === 'identity' && (
                  <div className="card-view active">
                    <div className="live-identity-card" title="Interactive Live Sovereign ₦Tag Preview">
                      <div className="card-monogram-watermark">₦</div>
                      <div className="card-header-row">
                        <div className="card-logo-symbol">₦</div>
                        <div className="card-net-pill">
                          <span>Arc Testnet</span>
                        </div>
                      </div>

                      <div className="card-avatar-stage">
                        <div className="card-avatar-svg-container">
                          <img
                            className="card-avatar-img-round"
                            style={{ width: '120px', height: '120px', borderRadius: '50%' }}
                            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${activeCleanTag || 'nairatag'}`}
                            alt={`₦${activeCleanTag}`}
                            onError={(e) => {
                              e.currentTarget.src =
                                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%2310b981"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="11" font-weight="bold">₦</text></svg>';
                            }}
                          />
                        </div>
                      </div>

                      <div className="card-footer-row">
                        <div className="card-identity-text">
                          <div className="card-handle-title">₦{activeCleanTag.toUpperCase()}</div>
                          <div className="card-status-subtitle">
                            <span className="card-status-dot" />
                            <span>Verified Onchain</span>
                          </div>
                        </div>
                        <div className="card-verified-badge" title="Verified Onchain Sovereign Tag">
                          <img src="/verified-badge.png" width="32" height="32" alt="Verified Sovereign Tag" />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="action-row-btn primary-accent"
                      onClick={() => triggerCopy('share_identity_link', `https://nairatag.ng/resolve?tag=₦${activeCleanTag.toUpperCase()}`)}
                    >
                      <span>{copiedKey === 'share_identity_link' ? '✓ Copied Resolve Link' : '🔗 Copy ₦Tag Link'}</span>
                    </button>
                  </div>
                )}

                {/* VIEW 2: Share Card View */}
                {claimCardMode === 'share' && (
                  <div className="card-view active">
                    <div className="sovereign-alt-card">
                      <div className="card-monogram-watermark">₦</div>
                      <div className="card-header-row">
                        <div className="card-logo-symbol">₦</div>
                        <div className="card-net-pill" style={{ fontSize: '10px' }}>
                          <span>✦ Share Pass</span>
                        </div>
                      </div>

                      <div className="card-avatar-stage" style={{ margin: '4px 0' }}>
                        <img
                          className="card-avatar-img-round"
                          style={{ width: '90px', height: '90px', borderRadius: '50%' }}
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${activeCleanTag || 'nairatag'}`}
                          alt={`₦${activeCleanTag}`}
                        />
                      </div>

                      <div className="card-footer-row" style={{ marginBottom: '2px' }}>
                        <div className="card-identity-text">
                          <div className="card-handle-title">₦{activeCleanTag.toUpperCase()}</div>
                        </div>
                        <div className="card-verified-badge">
                          <img src="/verified-badge.png" width="28" height="28" alt="Verified Sovereign Tag" />
                        </div>
                      </div>
                    </div>

                    <div className="share-actions-grid">
                      <button
                        type="button"
                        className="share-btn share-btn-x"
                        onClick={() => {
                          const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just claimed my sovereign ₦Tag: ₦${activeCleanTag.toUpperCase()} on @ArcNetwork! Send USDC gaslessly.`)}&url=${encodeURIComponent(`https://nairatag.ng/resolve?tag=₦${activeCleanTag.toUpperCase()}`)}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <span>Share on 𝕏</span>
                      </button>
                      <button
                        type="button"
                        className="share-btn share-btn-tg"
                        onClick={() => {
                          const url = `https://t.me/share/url?url=${encodeURIComponent(`https://nairatag.ng/resolve?tag=₦${activeCleanTag.toUpperCase()}`)}&text=${encodeURIComponent(`Send USDC to my ₦Tag: ₦${activeCleanTag.toUpperCase()} on Arc`)}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <span>✈ Telegram</span>
                      </button>
                      <button
                        type="button"
                        className="share-btn share-btn-wa"
                        onClick={() => {
                          const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Send USDC to my ₦Tag on Arc: https://nairatag.ng/resolve?tag=₦${activeCleanTag.toUpperCase()}`)}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <span>💬 WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        className="share-btn share-btn-copy"
                        onClick={() => triggerCopy('share_link_tab', `https://nairatag.ng/resolve?tag=₦${activeCleanTag.toUpperCase()}`)}
                      >
                        <span>{copiedKey === 'share_link_tab' ? '✓ Copied' : '🔗 Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 3: Referral Card View */}
                {claimCardMode === 'referral' && (
                  <div className="card-view active">
                    <div className="sovereign-alt-card">
                      <div className="card-header-row">
                        <div className="card-logo-symbol">₦</div>
                        <div className="card-net-pill" style={{ background: '#000000', color: '#bbf246', fontSize: '10px' }}>
                          <span>🎁 Ambassador Pass</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', margin: '4px 0 2px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1a1a1a' }}>
                          Invite Friends · Earn Protocol Points
                        </div>
                        <div className="card-handle-title" style={{ fontSize: '24px', marginTop: '2px' }}>
                          ₦{activeCleanTag.toUpperCase()}
                        </div>
                      </div>

                      <div className="referral-link-box">
                        <span className="referral-url-text">
                          {`https://nairatag.ng/claim?ref=₦${activeCleanTag.toUpperCase()}`}
                        </span>
                        <button
                          type="button"
                          className="referral-copy-chip"
                          onClick={() => triggerCopy('referral_link_chip', `https://nairatag.ng/claim?ref=₦${activeCleanTag.toUpperCase()}`)}
                        >
                          {copiedKey === 'referral_link_chip' ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      <div className="referral-metrics-grid">
                        <div className="referral-metric-tile">
                          <span className="metric-number">0</span>
                          <span className="metric-caption">Invited</span>
                        </div>
                        <div className="referral-metric-tile">
                          <span className="metric-number">0 pts</span>
                          <span className="metric-caption">Points</span>
                        </div>
                        <div className="referral-metric-tile">
                          <span className="metric-number">10%</span>
                          <span className="metric-caption">Tier Rebate</span>
                        </div>
                      </div>
                    </div>

                    <div className="share-actions-grid">
                      <button
                        type="button"
                        className="share-btn share-btn-x"
                        onClick={() => {
                          const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Claim your onchain ₦Tag handle using my referral: ₦${activeCleanTag.toUpperCase()} on Arc!`)}&url=${encodeURIComponent(`https://nairatag.ng/claim?ref=₦${activeCleanTag.toUpperCase()}`)}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <span>Share Ref on 𝕏</span>
                      </button>
                      <button
                        type="button"
                        className="share-btn share-btn-tg"
                        onClick={() => {
                          const url = `https://t.me/share/url?url=${encodeURIComponent(`https://nairatag.ng/claim?ref=₦${activeCleanTag.toUpperCase()}`)}&text=${encodeURIComponent(`Claim your ₦Tag on Arc with referral: ₦${activeCleanTag.toUpperCase()}`)}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <span>Invite on TG</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 4: QR Code Card View */}
                {claimCardMode === 'qrcode' && (
                  <div className="card-view active">
                    <div className="sovereign-alt-card">
                      <div className="card-header-row">
                        <div className="card-logo-symbol">₦</div>
                        <div className="card-net-pill" style={{ fontSize: '10px' }}>
                          <span>Arc Resolver QR</span>
                        </div>
                      </div>

                      <div className="qr-card-center-stage">
                        <div className="qr-canvas-holder">
                          <img
                            className="qr-image-el"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`arc:${walletAddress || '0x'}?tag=₦${activeCleanTag.toUpperCase()}`)}`}
                            alt="₦Tag Onchain QR Code"
                          />
                          <div className="qr-center-symbol-badge">₦</div>
                        </div>
                        <div className="qr-payload-banner">
                          {`arc:nairatag.ng/resolve?tag=₦${activeCleanTag.toUpperCase()}`}
                        </div>
                      </div>

                      <div className="card-footer-row">
                        <div className="card-identity-text">
                          <div className="card-handle-title" style={{ fontSize: '20px' }}>
                            ₦{activeCleanTag.toUpperCase()}
                          </div>
                        </div>
                        <div className="card-verified-badge">
                          <img src="/verified-badge.png" width="26" height="26" alt="Verified Sovereign Tag" />
                        </div>
                      </div>
                    </div>

                    <div className="share-actions-grid">
                      <button
                        type="button"
                        className="action-row-btn"
                        onClick={() => triggerCopy('qr_uri', `arc:${walletAddress || '0x'}?tag=₦${activeCleanTag.toUpperCase()}`)}
                      >
                        <span>{copiedKey === 'qr_uri' ? '✓ Copied URI' : '📋 Copy URI'}</span>
                      </button>
                      <button
                        type="button"
                        className="action-row-btn primary-accent"
                        onClick={() => {
                          window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`arc:${walletAddress || '0x'}?tag=₦${activeCleanTag.toUpperCase()}`)}`, '_blank');
                        }}
                      >
                        <span>🔍 View High-Res QR</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
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
                    title="Grid View (Milestones)"
                  >
                    <LayoutGrid size={13} />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn ${agentsViewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setAgentsViewMode('list')}
                    title="List View (Your Circle)"
                  >
                    <List size={13} />
                    <span>List</span>
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
                      <div className={`agent-circle-rank ${agent.rankTop || ''}`}>
                        {agent.rank}
                      </div>

                      <div className="agent-circle-avatar-wrap">
                        <img
                          src={agent.avatar}
                          alt={agent.name}
                          className="agent-circle-avatar-img"
                        />
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
            TAB 4: FAQ (PROTOCOL KNOWLEDGE BASE & ACCORDION)
            ─────────────────────────────────────────────────────────────────── */}
        {mainTab === 'faq' && (
          <div className="faq-page-container">
            {/* Hero Section */}
            <div className="faq-hero-card">
              <div className="faq-pill-badge">
                <HelpCircle size={12} />
                <span>Protocol Knowledge Base</span>
              </div>
              <h1 className="faq-title">Frequently Asked Questions</h1>
              <p className="faq-subtitle">
                Everything you need to know about sovereign ₦Tags on Arc Osaka EVM, USDC instant settlements, autonomous ERC-8004 AI agents, and non-custodial resolvers.
              </p>
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
      </main>

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
            </div>
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
    </>
  );
}

