'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { subscribeMarket } from '@/lib/ws';
import { StatusBadge } from '@/components/layout';
import { MarketOddsChart } from '@/components/markets/MarketOddsChart';
import { RecentTradesFeed, type RecentTrade } from '@/components/markets/RecentTradesFeed';
import { TradePanel, type TradeMarket } from '@/components/trade/TradePanel';
import { formatNotional } from '@/lib/format';
import type { LmsrState } from '@parity/shared';

interface Market extends TradeMarket {
  title: string;
  description: string;
  volumeNotional: number;
  closesAt: string;
  resolution?: string;
}

interface HistoryPoint {
  ts: string;
  yesCents: number;
  noCents: number;
  volume?: number;
}

export default function MarketDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [market, setMarket] = useState<Market | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  const refreshMarket = useCallback(() => {
    api<Market>(`/markets/${slug}`).then(setMarket);
    api<RecentTrade[]>(`/markets/${slug}/trades`).then(setTrades);
  }, [slug]);

  useEffect(() => {
    api<Market>(`/markets/${slug}`).then(setMarket);
    api<HistoryPoint[]>(`/markets/${slug}/history`).then(setHistory);
    api<RecentTrade[]>(`/markets/${slug}/trades`).then(setTrades);
    api('/users/me').then(() => setLoggedIn(true)).catch(() => setLoggedIn(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    return subscribeMarket(slug, (data) => {
      const d = data as {
        yesCents: number;
        noCents: number;
        volume: number;
        qYes?: number;
        qNo?: number;
        b?: number;
      };
      setMarket((m) => {
        if (!m) return m;
        const lmsrState: LmsrState | undefined =
          d.qYes != null && d.qNo != null && d.b != null
            ? { qYes: d.qYes, qNo: d.qNo, b: d.b }
            : m.lmsrState;
        return {
          ...m,
          yesCents: d.yesCents,
          noCents: d.noCents,
          volumeNotional: d.volume,
          lmsrState,
        };
      });
    });
  }, [slug]);

  if (!market) return <p style={{ color: 'var(--text-muted)' }}>Loading...</p>;

  return (
    <div className="market-detail">
      <div className="market-detail-main">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{market.title}</h1>
          <StatusBadge status={market.status} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          {market.description}
        </p>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div className="tabular">
            <div style={{ color: 'var(--yes)', fontSize: 24, fontWeight: 700 }}>
              {market.yesCents}¢
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>YES · {Math.round(market.yesCents)}%</div>
          </div>
          <div className="tabular">
            <div style={{ color: 'var(--no)', fontSize: 24, fontWeight: 700 }}>
              {market.noCents}¢
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>NO · {Math.round(market.noCents)}%</div>
          </div>
          <div className="tabular" style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 14 }}>{formatNotional(market.volumeNotional)} N</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Volume</div>
          </div>
        </div>

        <MarketOddsChart
          history={history}
          yesCents={market.yesCents}
          noCents={market.noCents}
          volume={market.volumeNotional}
        />
      </div>

      <div className="market-detail-trade card" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Trade</h2>
        {!loggedIn ? (
          <Link href="/login" className="btn">Sign in to trade</Link>
        ) : market.status !== 'OPEN' ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Market not open for trading</p>
        ) : (
          <TradePanel
            market={{
              ...market,
              title: market.title,
              closesAt: market.closesAt,
            }}
            onMarketUpdate={refreshMarket}
          />
        )}
      </div>

      <div className="card activity-feed-card">
        <RecentTradesFeed trades={trades} />
      </div>
    </div>
  );
}
