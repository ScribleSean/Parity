'use client';

import { useLayoutEffect, useRef, useState } from 'react';

const TICKER_LINE =
  'YES 63¢ · NO 37¢ · Politics · Sports · Culture · 100,000 N signup · ' +
  'Leaderboard · Live markets · YES 58¢ · NO 42¢ · Science · Business · ';

const PX_PER_SECOND = 80;

export function LandingTicker() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(35);

  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0) {
        setDuration(Math.max(12, halfWidth / PX_PER_SECOND));
      }
    };

    measure();
    document.fonts?.ready.then(measure);

    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);

    return () => ro.disconnect();
  }, []);

  return (
    <div className="landing-ticker" aria-hidden>
      <div
        ref={trackRef}
        className="landing-ticker-track"
        style={{ '--ticker-duration': `${duration}s` } as React.CSSProperties}
      >
        <span className="landing-ticker-segment">{TICKER_LINE}</span>
        <span className="landing-ticker-segment">{TICKER_LINE}</span>
      </div>
    </div>
  );
}
