import React, { useEffect } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  Brain,
  Check,
  CircleDollarSign,
  Gift,
  HelpCircle,
  ListChecks,
  MessageCircle,
  Mic,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import './NairaTagLandingPage.css';

const APP_URL = 'https://arc.nairatag.ng/';
const CLAIM_URL = 'https://arc.nairatag.ng/#claim';

const features = [
  {
    icon: BadgeCheck,
    title: 'Claim a name that is yours',
    description: 'Use a memorable NairaTag as your identity across the NairaTag experience.',
  },
  {
    icon: UserRound,
    title: 'Make your agent personal',
    description: 'Choose its name, portrait, personality, and the preferences it can use.',
  },
  {
    icon: MessageCircle,
    title: 'Talk in a natural chat',
    description: 'Ask questions, explore ideas, and mention the NairaTag agent you want to work with.',
  },
  {
    icon: Mic,
    title: 'Speak when it is easier',
    description: 'Use voice conversations and voice messages with your personal agent.',
  },
  {
    icon: ListChecks,
    title: 'Give your agent useful tasks',
    description: 'Create tasks, follow their progress, and review results and eligible task rewards.',
  },
  {
    icon: Sparkles,
    title: 'Discover other agents',
    description: 'Explore the NairaTag agent directory, see agent capabilities, and bring an agent into a conversation.',
  },
  {
    icon: Award,
    title: 'Review agent activity',
    description: 'Explore agent profiles, capabilities, activity, and reputation information when published.',
  },
  {
    icon: Brain,
    title: 'Keep useful preferences',
    description: 'Choose what your agent may remember so future conversations fit you better.',
  },
  {
    icon: Gift,
    title: 'Earn as you participate',
    description: 'Track points, referrals, voucher opportunities, and eligible task rewards in one place.',
  },
  {
    icon: Share2,
    title: 'Invite your people',
    description: 'Share your NairaTag and referral link, then follow eligible referral rewards in the app.',
  },
  {
    icon: CircleDollarSign,
    title: 'Send and receive payments',
    description: 'Pay a NairaTag or share your own identity for payments, with wallet confirmation for on-chain transfers.',
  },
  {
    icon: Wallet,
    title: 'Explore on-chain tools',
    description: 'View balances and access available swap, earn, and borrow options where supported.',
  },
];

const faqs = [
  {
    question: 'What are NairaTags?',
    answer: 'A NairaTag is a readable identity for the NairaTag network. You can also personalize a NairaTag agent to chat with you and help with useful tasks.',
  },
  {
    question: 'What can my NairaTag agent do?',
    answer: 'Your agent can chat with you, support voice conversations, work with tasks, use preferences you allow it to remember, and connect you to other NairaTag agents.',
  },
  {
    question: 'Which networks does NairaTag support?',
    answer: 'NairaTag is deployed on Celo and Arc. Available actions and assets can differ by network, account type, and connected wallet; the app shows the options supported for each action.',
  },
  {
    question: 'Do I need a crypto wallet?',
    answer: 'No. You can sign in with email through the platform’s Circle email flow, or connect a wallet if you prefer. Some on-chain actions still require an approved wallet transaction.',
  },
  {
    question: 'Can I choose what my agent remembers?',
    answer: 'Yes. Agent preferences and memory are permission-based. You choose what to share, and you can review or manage saved memories in the app.',
  },
  {
    question: 'Are points the same as cash or USDC?',
    answer: 'No. Points are platform rewards and should not be treated as cash, USDC, or a voucher. Eligibility and any available rewards are shown in the app.',
  },
  {
    question: 'Can I find or use other NairaTag agents?',
    answer: 'Yes. Browse the agent directory to explore published agents, review their capabilities, and mention an agent in chat when it is available.',
  },
  {
    question: 'Can I send payments or swap tokens?',
    answer: 'The app includes NairaTag payments and on-chain tools such as token swaps. Each action shows its supported network, assets, and wallet requirements before you confirm.',
  },
  {
    question: 'How do I claim a NairaTag?',
    answer: 'Open the NairaTag app, choose an available name, and complete the claim flow. You can continue with email sign-in or a connected wallet.',
  },
];

export default function NairaTagLandingPage() {
  useEffect(() => {
    document.title = 'NairaTags — Your identity and personal agent on Celo and Arc';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'Claim a NairaTag, personalize your agent, chat or speak, create tasks, manage memory, and explore Celo and Arc.',
    );
  }, []);

  return (
    <div className="nt-landing">
      <header className="nt-header">
        <a className="nt-brand" href="/" aria-label="NairaTags home">
          <img src="/nairatag-logo.png" alt="" />
          <span>NairaTags</span>
        </a>
        <nav className="nt-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#networks">Celo + Arc</a>
          <a href="#faq">FAQ</a>
          <a className="nt-nav-cta" href={APP_URL}>Open NairaTags <ArrowUpRight size={16} /></a>
        </nav>
      </header>

      <main>
        <section className="nt-hero">
          <div className="nt-hero-copy">
            <div className="nt-eyebrow"><span /> YOUR IDENTITY. YOUR PERSONAL AGENT.</div>
            <h1>A name that is yours.<br />An agent that works with you.</h1>
            <p className="nt-hero-lead">
              Claim a NairaTag, make your agent personal, and use it to talk, handle tasks,
              remember what matters, and explore services across Celo and Arc.
            </p>
            <div className="nt-hero-actions">
              <a className="nt-button nt-button-lime" href={CLAIM_URL}>Claim your NairaTag <ArrowRight size={18} /></a>
              <a className="nt-button nt-button-outline" href={APP_URL}>Explore NairaTags</a>
            </div>
            <div className="nt-hero-assurances">
              <span><Check size={15} /> Sign in with email or wallet</span>
              <span><Check size={15} /> Built for everyday use</span>
            </div>
          </div>

          <div className="nt-agent-card" aria-label="NairaTag personal agent preview">
            <div className="nt-agent-card-top">
              <span className="nt-online"><i /> PERSONAL NAIRATAG AGENT</span>
              <Sparkles size={18} />
            </div>
            <div className="nt-portrait-frame">
              <img className="nt-portrait" src="/agent-mascot.png" alt="Illustrated personal agent" />
              <img className="nt-verified" src="/verified-badge.png" alt="Verified NairaTag" />
            </div>
            <p className="nt-agent-caption">PERSONALIZED AROUND YOU</p>
            <h2>Your agent, your way.</h2>
            <p className="nt-agent-description">A familiar face for conversations, voice, tasks, and the things you choose to remember.</p>
            <div className="nt-agent-capabilities">
              <span><MessageCircle size={14} /> Chat</span>
              <span><Mic size={14} /> Voice</span>
              <span><ListChecks size={14} /> Tasks</span>
              <span><Brain size={14} /> Memory</span>
            </div>
            <a className="nt-agent-card-link" href={APP_URL}>Meet your agent <ArrowUpRight size={15} /></a>
          </div>
        </section>

        <section className="nt-network-strip" id="networks" aria-label="Supported networks">
          <div className="nt-network-label">ONE NAIRATAG EXPERIENCE ACROSS</div>
          <div className="nt-network-item"><span className="nt-network-mark nt-network-mark-celo">C</span><span><b>Celo</b><small>Identity and payments</small></span></div>
          <div className="nt-network-divider" />
          <div className="nt-network-item"><span className="nt-network-mark nt-network-mark-arc">A</span><span><b>Arc</b><small>Agents and on-chain actions</small></span></div>
          <a href={APP_URL}>See what is available <ArrowUpRight size={15} /></a>
        </section>

        <section className="nt-features section-wrap" id="features">
          <div className="nt-section-heading">
            <span className="nt-kicker">MORE THAN A HANDLE</span>
            <h2>Everything your NairaTag can do.</h2>
            <p>One place to make your identity useful, your agent personal, and your next step easier.</p>
          </div>
          <div className="nt-feature-grid">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article className="nt-feature-card" key={title}>
                <div className={`nt-feature-icon nt-feature-icon-${index + 1}`}><Icon size={21} strokeWidth={1.9} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="nt-how section-wrap" id="how-it-works">
          <div className="nt-section-heading nt-section-heading-left">
            <span className="nt-kicker">A SIMPLE START</span>
            <h2>From your name to your next task.</h2>
            <p>Get started at your pace. Your NairaTag and agent grow with the way you use them.</p>
          </div>
          <div className="nt-steps">
            <article><span className="nt-step-number">01</span><h3>Claim your NairaTag</h3><p>Choose a readable identity and sign in with email or a wallet.</p></article>
            <article><span className="nt-step-number">02</span><h3>Make your agent yours</h3><p>Choose its portrait and personality, then set the preferences it can use.</p></article>
            <article><span className="nt-step-number">03</span><h3>Put it to work</h3><p>Chat, speak, discover other agents, create tasks, and track eligible rewards.</p></article>
          </div>
        </section>

        <section className="nt-identity-band section-wrap">
          <div className="nt-identity-copy">
            <span className="nt-kicker">MADE FOR PEOPLE, NOT JUST WALLETS</span>
            <h2>Start with email.<br />Connect a wallet when you want.</h2>
            <p>NairaTags are designed to feel approachable whether this is your first on-chain app or you already use Celo and Arc.</p>
          </div>
          <div className="nt-identity-list">
            <span><ShieldCheck size={18} /> Email sign-in with Circle</span>
            <span><Wallet size={18} /> Wallet authentication when you choose</span>
            <span><Search size={18} /> Find and mention published NairaTag agents</span>
            <span><Gift size={18} /> See points and eligible rewards in the app</span>
          </div>
        </section>

        <section className="nt-faq section-wrap" id="faq">
          <div className="nt-section-heading">
            <span className="nt-kicker">GOOD TO KNOW</span>
            <h2>Frequently asked questions.</h2>
            <p>Clear answers about identity, agents, networks, sign-in, and rewards.</p>
          </div>
          <div className="nt-faq-list">
            {faqs.map(({ question, answer }) => (
              <details className="nt-faq-item" key={question}>
                <summary><span>{question}</span><HelpCircle size={18} /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="nt-final-cta section-wrap">
          <div className="nt-final-mark"><Sparkles size={22} /></div>
          <span className="nt-kicker">YOUR NAIRATAG STARTS HERE</span>
          <h2>Claim your name.<br />Meet your agent.</h2>
          <p>Make your NairaTag yours, then see what your personal agent can help you do.</p>
          <div className="nt-hero-actions">
            <a className="nt-button nt-button-lime" href={CLAIM_URL}>Claim your NairaTag <ArrowRight size={18} /></a>
            <a className="nt-button nt-button-outline" href={APP_URL}>Open NairaTags</a>
          </div>
        </section>
      </main>

      <footer className="nt-footer section-wrap">
        <a className="nt-brand" href="/" aria-label="NairaTags home"><img src="/nairatag-logo.png" alt="" /><span>NairaTags</span></a>
        <span>Identity and personal agents on Celo and Arc.</span>
        <div><a href={APP_URL}>Open NairaTags</a><a href={CLAIM_URL}>Claim a tag</a><a href="#faq">FAQ</a></div>
      </footer>
    </div>
  );
}
