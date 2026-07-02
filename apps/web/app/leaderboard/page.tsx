'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'weekly' | 'alltime'>('alltime');
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    api<{ entries: Array<Record<string, unknown>> }>(`/leaderboard?period=${period}`).then((d) =>
      setEntries(d.entries),
    );
  }, [period]);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Leaderboard</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn ${period === 'weekly' ? '' : 'btn-ghost'}`} onClick={() => setPeriod('weekly')}>Weekly</button>
        <button className={`btn ${period === 'alltime' ? '' : 'btn-ghost'}`} onClick={() => setPeriod('alltime')}>All-time</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Ranked by PnL. Min 3 settled markets to appear.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>PnL</th>
            <th>Win rate</th>
            <th>Settled</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.userId as string}>
              <td className="tabular">{e.rank as number}</td>
              <td>{e.username as string}</td>
              <td className="tabular" style={{ color: (e.pnl as number) >= 0 ? 'var(--yes)' : 'var(--no)' }}>
                {(e.pnl as number).toLocaleString()} N
              </td>
              <td className="tabular">{e.winRate as number}%</td>
              <td className="tabular">{e.settledMarkets as number}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
