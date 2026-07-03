'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HeroBackground } from './HeroBackground';
import { LandingTicker } from './LandingTicker';
import { ParityLogo } from '@/components/brand/ParityLogo';
import { useWallet } from '@/lib/wallet-context';

const ROTATING_TOPICS = [
  'pop culture',
  'politics',
  'sports',
  'business',
  'science',
  'world events',
];

export function LandingHero() {
  const { user } = useWallet();
  const [topicIndex, setTopicIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const wordRef = useRef<HTMLSpanElement>(null);
  const [wordWidth, setWordWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wordRef.current;
    if (!el) return;
    setWordWidth(el.scrollWidth);
  }, [topicIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setTopicIndex((i) => (i + 1) % ROTATING_TOPICS.length);
        setFade(true);
      }, 280);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-hero">
      <HeroBackground />
      <div className="landing-glow landing-glow-a" aria-hidden />
      <div className="landing-glow landing-glow-b" aria-hidden />

      <div className="landing-content">
        <div className="landing-brand-lockup">
          <ParityLogo wordmarkClassName="landing-brand-wordmark" />
        </div>
        <p className="landing-eyebrow">Markets find parity</p>

        <h1 className="landing-title">
          Trade the future.
          <br />
          <span className="landing-title-muted">Only risk your pride.</span>
        </h1>

        <p className="landing-sub">
          Want to bet on{' '}
          <span
            className="landing-carousel-slot"
            style={wordWidth != null ? { width: wordWidth } : undefined}
          >
            <span
              ref={wordRef}
              className={`landing-carousel-word ${fade ? 'visible' : ''}`}
            >
              {ROTATING_TOPICS[topicIndex]}
            </span>
          </span>
          {' '}but don&apos;t have fallback money?
        </p>

        <p className="landing-tagline">
          Trade on parity. Start with <strong>100,000 N</strong>, climb your way to the top.
        </p>

        <div className="landing-cta">
          <Link
            href={user ? '/markets' : '/login'}
            className="btn btn-primary landing-btn"
          >
            {user ? 'Make your next trade' : 'Get started — free'}
          </Link>
          <Link href="/markets" className="btn btn-ghost landing-btn">
            Browse markets
          </Link>
        </div>

        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-value tabular">100,000 N</span>
            <span className="landing-stat-label">Starting balance</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-value tabular">Live</span>
            <span className="landing-stat-label">AMM odds</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-value tabular">$0</span>
            <span className="landing-stat-label">Real money at risk</span>
          </div>
        </div>
      </div>

      <LandingTicker />
    </div>
  );
}
