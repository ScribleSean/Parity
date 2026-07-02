'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PriceBar, StatusBadge } from '@/components/layout';
import { MARKET_CATEGORIES } from '@parity/shared';
import { formatNotional } from '@/lib/format';

interface Market {
  slug: string;
  title: string;
  category: string;
  status: string;
  yesCents: number;
  noCents: number;
  volumeNotional: number;
  closesAt: string;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    setLoading(true);
    api<{ items: Market[] }>(`/markets?${params}`)
      .then((data) => setMarkets(data.items))
      .finally(() => setLoading(false));
  }, [status, category, q]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Markets</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Trade binary YES/NO contracts with Notional (N)
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'OPEN', 'CLOSED', 'RESOLVED'].map((s) => (
          <button
            key={s || 'all'}
            className={`btn ${status === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatus(s)}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={`btn ${!category ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setCategory('')}
        >
          All categories
        </button>
        {MARKET_CATEGORIES.map((c) => (
          <button
            key={c}
            className={`btn ${category === c ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder="Search markets..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : (
        <div className="grid-markets">
          {markets.map((m) => (
            <Link
              key={m.slug}
              href={`/markets/${m.slug}`}
              className="card card-interactive"
              style={{ padding: 14, display: 'block' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
                <StatusBadge status={m.status} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 8 }}>
                <span className="tabular" style={{ color: 'var(--yes)' }}>
                  YES {m.yesCents}¢ · {Math.round(m.yesCents)}%
                </span>
                <span className="tabular" style={{ color: 'var(--no)' }}>
                  NO {m.noCents}¢ · {Math.round(m.noCents)}%
                </span>
              </div>
              <PriceBar yesCents={m.yesCents} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{m.category}</span>
                <span className="tabular">Vol {formatNotional(m.volumeNotional)} N</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
