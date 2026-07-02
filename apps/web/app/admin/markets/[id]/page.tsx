'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/layout';

export default function AdminMarketPage() {
  const params = useParams();
  const id = params.id as string;
  const [market, setMarket] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api<{ items: Array<Record<string, unknown>> }>('/admin/markets').then((d) => {
      setMarket(d.items.find((m) => m.id === id) || null);
    });
  }, [id]);

  if (!market) return <p>Loading...</p>;

  return (
    <div>
      <Link href="/admin" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Admin</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0' }}>{market.title as string}</h1>
      <StatusBadge status={market.status as string} />
      <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>{market.description as string}</p>
      <p style={{ marginTop: 8, fontSize: 13 }}>Slug: <Link href={`/markets/${market.slug}`}>{market.slug as string}</Link></p>
    </div>
  );
}
