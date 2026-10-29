import React, { useEffect } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  MessageCircle,
  Mic,
  Sparkles,
  Workflow,
} from 'lucide-react';
import './NairaTagLanding.css';

const APP_URL = 'https://arc.nairatag.ng/';
const CLAIM_URL = 'https://arc.nairatag.ng/';

const features = [
  {
    icon: MessageCircle,
    title: 'Talk through anything',
    description: 'Get help, explore an idea, or work through a question in a natural conversation.',
  },
  {
    icon: Mic,
    title: 'Speak when it feels easier',
    description: 'Talk with your agent by voice and continue the conversation in chat.',
  },
  {
    icon: Workflow,
    title: 'Hand off useful work',
    description: 'Give your agent a task, follow its progress, and review what it completes.',
  },
  {
    icon: Brain,
    title: 'Keep what matters in mind',
    description: 'Your agent can remember preferences you choose to share and use them later.',
  },
];

export default function NairaTagLanding() {
  useEffect(() => {
    document.title = 'NairaTag — Your identity, with an agent by your side';
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute(
      'content',
      'Claim your NairaTag and meet a personal agent that can talk, listen, help with tasks, and remember what matters to you.',
    );
  }, []);

  return (
    <div className="naira-landing">
      <header className="naira-landing__header">
        <a className="naira-landing__brand" href="/" aria-label="NairaTag home">
          <img src="/nairatag-logo.png" alt="" />
          <span>NairaTag</span>
        </a>
        <nav className="naira-landing__nav" aria-label="Main navigation">
          <a href="#what-you-can-do">What you can do</a>
          <a href="#your-identity">Your identity</a>
          <a className="naira-landing__nav-cta" href={APP_URL}>
            Open NairaDots <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </header>

      <main>
        <section className="naira-landing__hero">
          <div className="naira-landing__hero-copy">
            <div className="naira-landing__eyebrow">
              <span className="naira-landing__eyebrow-dot" />
              YOUR IDENTITY, WITH AN AGENT BY YOUR SIDE
            </div>
            <h1>Your name.<br />Your own agent.</h1>
            <p className="naira-landing__hero-description">
              Claim a NairaTag that feels like you. Then meet an agent you can talk to,
              give tasks to, and make your own over time.
            </p>
            <div className="naira-landing__actions">
              <a className="naira-landing__button naira-landing__button--primary" href={APP_URL}>
                Meet your agent <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="naira-landing__button naira-landing__button--secondary" href={CLAIM_URL}>
                Claim your NairaTag
              </a>
            </div>
            <div className="naira-landing__trust-note">
              <Check size={15} aria-hidden="true" />
              Sign in with email or connect a wallet
            </div>
          </div>

          <div className="naira-landing__visual" aria-label="A preview of a personal NairaTag agent">
            <div className="naira-landing__visual-topline">
              <span><span className="naira-landing__online-dot" /> YOUR NAIRATAG AGENT</span>
              <Sparkles size={17} aria-hidden="true" />
            </div>
            <div className="naira-landing__portrait-wrap">
              <img className="naira-landing__portrait" src="/agent-mascot.png" alt="Illustrated NairaTag agent" />
              <img className="naira-landing__verified" src="/verified-badge.png" alt="Verified" />
            </div>
            <div className="naira-landing__agent-name">Meet your agent</div>
            <p className="naira-landing__agent-caption">Ready to listen, help, and learn your preferences.</p>
            <div className="naira-landing__quick-capabilities">
              <span><MessageCircle size={14} /> Talk</span>
              <span><Mic size={14} /> Voice</span>
              <span><Workflow size={14} /> Tasks</span>
              <span><Brain size={14} /> Memory</span>
            </div>
            <div className="naira-landing__chat-preview">
              <span className="naira-landing__chat-avatar">₦</span>
              <span>What would you like to work on today?</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="naira-landing__features" id="what-you-can-do">
          <div className="naira-landing__section-heading">
            <span className="naira-landing__section-kicker">MORE THAN A NAME</span>
            <h2>A personal agent that fits into your day.</h2>
            <p>Start with a conversation. Let your agent help in the ways that are useful to you.</p>
          </div>
          <div className="naira-landing__feature-grid">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article className="naira-landing__feature" key={title}>
                <div className={`naira-landing__feature-icon naira-landing__feature-icon--${index + 1}`}>
                  <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="naira-landing__identity" id="your-identity">
          <div>
            <span className="naira-landing__section-kicker">START WITH YOUR NAIRATAG</span>
            <h2>A name people can remember.<br />An agent that feels like yours.</h2>
            <p>Claim your identity, personalize your agent, and keep building from there.</p>
          </div>
          <div className="naira-landing__identity-actions">
            <a className="naira-landing__button naira-landing__button--light" href={CLAIM_URL}>
              Claim your NairaTag <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="naira-landing__text-link" href={APP_URL}>Already have one? Open NairaDots <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </section>
      </main>

      <footer className="naira-landing__footer">
        <a className="naira-landing__brand" href="/" aria-label="NairaTag home">
          <img src="/nairatag-logo.png" alt="" />
          <span>NairaTag</span>
        </a>
        <span>Your name. Your own agent.</span>
        <div>
          <a href={APP_URL}>NairaDots</a>
          <a href={CLAIM_URL}>Claim a tag</a>
        </div>
      </footer>
    </div>
  );
}
