'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatNotional, notifyBalanceChanged } from '@/lib/format';

interface WalletState {
  balance: number;
  eligible: boolean;
  canFreeRefill: boolean;
  freeRefillsRemaining: number;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [ledger, setLedger] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  function load() {
    api<WalletState>('/wallet').then(setWallet);
    api<{ items: Array<Record<string, unknown>> }>('/wallet/ledger').then((d) => setLedger(d.items));
  }

  useEffect(() => { load(); }, []);

  async function refill() {
    try {
      await api('/wallet/refill', { method: 'POST', body: '{}' });
      setMsg('Refill successful');
      notifyBalanceChanged();
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Refill failed');
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Wallet</h1>
      <p className="disclaimer" style={{ marginBottom: 16 }}>
        Notional is simulated currency. No real money. No prizes with cash value.
      </p>
      {wallet && (
        <div className="card" style={{ padding: 16, marginBottom: 24, maxWidth: 400 }}>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            {wallet ? `${formatNotional(wallet.balance)} N` : '—'}
          </div>
          {wallet.canFreeRefill && (
            <button className="btn" onClick={refill}>Request free refill</button>
          )}
          {!wallet.canFreeRefill && wallet.eligible && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Free refills exhausted this month</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Free refills remaining: {wallet.freeRefillsRemaining}/4 this month
          </p>
        </div>
      )}
      {msg && <p style={{ marginBottom: 16 }}>{msg}</p>}
      <h2 style={{ fontSize: 14, marginBottom: 12 }}>Ledger</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((e) => (
            <tr key={e.id as string}>
              <td>{e.type as string}</td>
              <td className="tabular">{formatNotional(e.amount as number)} N</td>
              <td className="tabular">{formatNotional(e.balanceAfter as number)} N</td>
              <td>{new Date(e.createdAt as string).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link href="/markets" style={{ display: 'inline-block', marginTop: 16, fontSize: 13 }}>← Markets</Link>
    </div>
  );
}
