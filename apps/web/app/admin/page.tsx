'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/layout';

export default function AdminPage() {
  const [markets, setMarkets] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: Array<Record<string, unknown>> }>('/admin/markets')
      .then((d) => setMarkets(d.items))
      .catch((e) => setError(e.message));
  }, []);

  async function action(id: string, type: string, body?: object) {
    await api(`/admin/markets/${id}/${type}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await api<{ items: Array<Record<string, unknown>> }>('/admin/markets');
    setMarkets(d.items);
  }

  if (error) return <p style={{ color: 'var(--no)' }}>{error}. Admin access required.</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin</h1>
        <Link href="/admin/markets/new" className="btn">New market</Link>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <tr key={m.id as string}>
              <td>
                <Link href={`/admin/markets/${m.id}`}>{m.title as string}</Link>
              </td>
              <td><StatusBadge status={m.status as string} /></td>
              <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {m.status === 'DRAFT' && (
                  <button className="btn" onClick={() => action(m.id as string, 'publish')}>Publish</button>
                )}
                {m.status === 'OPEN' && (
                  <button className="btn btn-ghost" onClick={() => action(m.id as string, 'close')}>Close</button>
                )}
                {(m.status === 'CLOSED' || m.status === 'OPEN') && (
                  <>
                    <button className="btn btn-yes" onClick={() => action(m.id as string, 'resolve', { resolution: 'YES' })}>Resolve YES</button>
                    <button className="btn btn-no" onClick={() => action(m.id as string, 'resolve', { resolution: 'NO' })}>Resolve NO</button>
                    <button className="btn btn-ghost" onClick={() => action(m.id as string, 'void')}>Void</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
