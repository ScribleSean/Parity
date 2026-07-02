'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { MARKET_CATEGORIES } from '@parity/shared';

export default function NewMarketPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Other',
    opensAt: new Date().toISOString().slice(0, 16),
    closesAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  });
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const market = await api<{ id: string }>('/admin/markets', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          opensAt: new Date(form.opensAt).toISOString(),
          closesAt: new Date(form.closesAt).toISOString(),
        }),
      });
      router.push(`/admin/markets/${market.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Create market</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <input className="input" placeholder="Title (question)?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="input" placeholder="Resolution criteria" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {MARKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Opens</label>
        <input className="input" type="datetime-local" value={form.opensAt} onChange={(e) => setForm({ ...form, opensAt: e.target.value })} />
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Closes</label>
        <input className="input" type="datetime-local" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
        <button className="btn" type="submit">Create draft</button>
      </form>
      {error && <p style={{ color: 'var(--no)', marginTop: 12 }}>{error}</p>}
    </div>
  );
}
