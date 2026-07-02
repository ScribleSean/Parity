'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HeroBackground } from './HeroBackground';

const ROTATING_TOPICS = [
  'pop culture',
  'politics',
  'sports',
  'business',
  'science',
  'world events',
];

export function LandingHero() {
  const [topicIndex, setTopicIndex] = useState(0);
  const [fade, setFade] = useState(true);

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
        <p className="landing-eyebrow">Welcome to Parity</p>

        <h1 className="landing-title">
          Trade the future.
          <br />
          <span className="landing-title-muted">Risk nothing real.</span>
        </h1>

        <p className="landing-sub">
          Want to participate in{' '}
          <span className={`landing-carousel-word ${fade ? 'visible' : ''}`}>
            {ROTATING_TOPICS[topicIndex]}
          </span>
          {' '}but don&apos;t have fallback money?
        </p>

        <p className="landing-tagline">
          Bet on Parity. Start with <strong>100,000 N</strong>, climb your way to the top.
        </p>

        <div className="landing-cta">
          <Link href="/login" className="btn btn-primary landing-btn">
            Get started — free
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

      <div className="landing-ticker" aria-hidden>
        <div className="landing-ticker-track">
          {[...Array(2)].map((_, dup) => (
            <span key={dup}>
              YES 63¢ · NO 37¢ · Politics · Sports · Culture · 100,000 N signup ·
              Leaderboard · Live markets · YES 58¢ · NO 42¢ · Science · Business ·
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
