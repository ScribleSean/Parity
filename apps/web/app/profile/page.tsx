'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const [form, setForm] = useState({ username: '', displayName: '', avatarUrl: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ username: string; displayName: string; avatarUrl: string | null }>('/users/me').then((u) =>
      setForm({
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl || '',
      }),
    );
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          username: form.username,
          displayName: form.displayName,
          avatarUrl: form.avatarUrl || null,
        }),
      });
      setMsg('Saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div style={{ maxWidth: 400 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Profile</h1>
      <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Username</label>
        <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Display name</label>
        <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avatar URL</label>
        <input className="input" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
        <button className="btn" type="submit">Save</button>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
