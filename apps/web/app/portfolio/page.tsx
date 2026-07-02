'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Array<Record<string, unknown>>>('/positions'),
      api<Array<Record<string, unknown>>>('/positions/history'),
    ])
      .then(([open, hist]) => {
        setPositions(open);
        setHistory(hist);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div>
        <p style={{ color: 'var(--no)' }}>{error}</p>
        <Link href="/login">Sign in</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Portfolio</h1>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-muted)' }}>Open positions</h2>
      <table className="table" style={{ marginBottom: 32 }}>
        <thead>
          <tr>
            <th>Market</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Entry</th>
            <th>Current</th>
            <th>Unrealized PnL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={i}>
              <td><Link href={`/markets/${p.slug}`}>{p.title as string}</Link></td>
              <td>{p.outcome as string}</td>
              <td className="tabular">{p.quantity as number}</td>
              <td className="tabular">{p.avgEntryCents as number}¢</td>
              <td className="tabular">{p.currentPriceCents as number}¢</td>
              <td className="tabular" style={{ color: (p.unrealizedPnl as number) >= 0 ? 'var(--yes)' : 'var(--no)' }}>
                {(p.unrealizedPnl as number).toLocaleString()} N
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {positions.length === 0 && <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>No open positions</p>}

      <h2 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-muted)' }}>Settled</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Market</th>
            <th>Resolution</th>
            <th>Side</th>
            <th>Cost basis</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i}>
              <td>{h.title as string}</td>
              <td>{h.resolution as string}</td>
              <td>{h.outcome as string}</td>
              <td className="tabular">{h.costBasisNotional as number} N</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
