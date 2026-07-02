'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SLIPPAGE_WARNING_CENTS } from '@parity/shared';
import { api } from '@/lib/api';
import { formatNotional, notifyBalanceChanged } from '@/lib/format';
import {
  contractsForBuyNotional,
  contractsForSellNotional,
  formatContracts,
  maxBuyNotional,
  maxPayout,
  maxSellNotional,
  MIN_TRADE_NOTIONAL,
  MAX_TRADE_NOTIONAL,
  parseNotionalInput,
  previewTrade,
} from '@/lib/trade-math';
import { useWallet } from '@/lib/wallet-context';
import type { LmsrState } from '@parity/shared';

interface Position {
  slug: string;
  outcome: 'YES' | 'NO';
  quantity: number;
  avgEntryCents: number;
  costBasisNotional: number;
}

interface QuoteResponse {
  quoteId: string;
  avgPriceCents: number;
  totalCostNotional: number;
  priceImpactCents: number;
}

export interface TradeMarket {
  slug: string;
  title?: string;
  status: string;
  yesCents: number;
  noCents: number;
  closesAt?: string;
  lmsrState?: LmsrState;
}

const SLIDER_STEPS = 200;

export function TradePanel({
  market,
  onMarketUpdate,
}: {
  market: TradeMarket;
  onMarketUpdate: () => void;
}) {
  const { balance } = useWallet();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [notionalInput, setNotionalInput] = useState('');
  const [sliderPct, setSliderPct] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [serverQuote, setServerQuote] = useState<QuoteResponse | null>(null);
  const [executing, setExecuting] = useState(false);
  const [msg, setMsg] = useState('');
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);

  const lmsrState = market.lmsrState;
  const yesPosition = positions.find((p) => p.outcome === 'YES');
  const noPosition = positions.find((p) => p.outcome === 'NO');
  const heldYes = yesPosition?.quantity ?? 0;
  const heldNo = noPosition?.quantity ?? 0;
  const held = outcome === 'YES' ? heldYes : heldNo;
  const costBasis =
    (outcome === 'YES' ? yesPosition?.costBasisNotional : noPosition?.costBasisNotional) ?? 0;

  const loadPositions = useCallback(() => {
    api<Position[]>('/positions')
      .then((all) => setPositions(all.filter((p) => p.slug === market.slug)))
      .catch(() => setPositions([]));
  }, [market.slug]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const maxNotional = useMemo(() => {
    if (!lmsrState) return 0;
    if (side === 'SELL') return maxSellNotional(lmsrState, outcome, held);
    if (balance == null) return 0;
    return maxBuyNotional(lmsrState, outcome, balance);
  }, [lmsrState, side, outcome, held, balance]);

  const notional = parseNotionalInput(notionalInput);

  const contracts = useMemo(() => {
    if (!lmsrState || notional <= 0) return 0;
    if (side === 'BUY') return contractsForBuyNotional(lmsrState, outcome, notional);
    return contractsForSellNotional(lmsrState, outcome, notional, held);
  }, [lmsrState, side, outcome, notional, held]);

  const preview = useMemo(() => {
    if (!lmsrState || contracts <= 0) return null;
    return previewTrade(lmsrState, side, outcome, contracts);
  }, [lmsrState, side, outcome, contracts]);

  const oddsPercent = outcome === 'YES' ? market.yesCents : market.noCents;
  const payout = side === 'BUY' ? maxPayout(contracts) : preview?.costNotional ?? 0;

  const validation = useMemo(() => {
    if (notional <= 0) return '';
    if (!lmsrState || !preview || contracts <= 0) return 'Amount too small';
    if (side === 'SELL') {
      if (held <= 0) return `No ${outcome} contracts to sell`;
      if (contracts > held + 0.0001) return `Exceeds your ${formatContracts(held)} contracts`;
    }
    const amount = preview.costNotional;
    if (side === 'BUY') {
      if (amount < MIN_TRADE_NOTIONAL) return `Minimum trade is ${MIN_TRADE_NOTIONAL} N`;
      if (amount > MAX_TRADE_NOTIONAL) return `Maximum trade is ${formatNotional(MAX_TRADE_NOTIONAL)} N`;
      if (balance != null && amount > balance + 0.01) {
        return `Insufficient Notional`;
      }
    }
    return '';
  }, [notional, lmsrState, preview, contracts, side, outcome, held, balance]);

  const realizedPnl = useMemo(() => {
    if (side !== 'SELL' || !preview || contracts <= 0 || held <= 0) return null;
    const basisShare = (costBasis / held) * contracts;
    return preview.costNotional - basisShare;
  }, [side, preview, contracts, held, costBasis]);

  function applySlider(pct: number) {
    const clamped = Math.max(0, Math.min(100, pct));
    setSliderPct(clamped);
    if (!lmsrState || maxNotional <= 0) {
      setNotionalInput('');
      return;
    }
    syncing.current = true;
    if (clamped === 0) {
      setNotionalInput('');
    } else {
      const n = Math.round((maxNotional * clamped) / 100 * 100) / 100;
      setNotionalInput(String(n));
    }
    queueMicrotask(() => {
      syncing.current = false;
    });
  }

  function applyNotionalInput(raw: string) {
    setNotionalInput(raw);
    if (syncing.current || maxNotional <= 0) return;
    const n = parseNotionalInput(raw);
    const pct = n <= 0 ? 0 : Math.min(100, (n / maxNotional) * 100);
    setSliderPct(Math.round(pct * 10) / 10);
  }

  useEffect(() => {
    setNotionalInput('');
    setSliderPct(0);
    setServerQuote(null);
  }, [side, outcome]);

  useEffect(() => {
    setServerQuote(null);
    if (validation || contracts <= 0 || market.status !== 'OPEN') return;
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(() => {
      api<QuoteResponse>(`/markets/${market.slug}/quote`, {
        method: 'POST',
        body: JSON.stringify({ side, outcome, quantity: contracts }),
      })
        .then(setServerQuote)
        .catch(() => setServerQuote(null));
    }, 300);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [market.slug, market.status, side, outcome, contracts, validation]);

  async function executeTrade() {
    if (validation || contracts <= 0) return;
    setExecuting(true);
    setMsg('');
    try {
      let quoteId = serverQuote?.quoteId;
      if (!quoteId) {
        const q = await api<QuoteResponse>(`/markets/${market.slug}/quote`, {
          method: 'POST',
          body: JSON.stringify({ side, outcome, quantity: contracts }),
        });
        quoteId = q.quoteId;
      }
      await api(`/markets/${market.slug}/trade`, {
        method: 'POST',
        body: JSON.stringify({ quoteId }),
      });
      setMsg(`${side === 'BUY' ? 'Bought' : 'Sold'} ${formatContracts(contracts)} ${outcome}`);
      setNotionalInput('');
      setSliderPct(0);
      setServerQuote(null);
      notifyBalanceChanged();
      loadPositions();
      onMarketUpdate();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Trade failed');
    } finally {
      setExecuting(false);
    }
  }

  const canTrade = !validation && notional > 0 && contracts > 0 && !executing;
  const closeDate = market.closesAt
    ? new Date(market.closesAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="trade-panel-v2">
      <div className="trade-v2-tabs">
        <button
          type="button"
          className={`trade-v2-tab ${side === 'BUY' ? 'active' : ''}`}
          onClick={() => setSide('BUY')}
        >
          Buy
        </button>
        <button
          type="button"
          className={`trade-v2-tab ${side === 'SELL' ? 'active' : ''}`}
          onClick={() => setSide('SELL')}
          disabled={heldYes === 0 && heldNo === 0}
        >
          Sell
        </button>
        <span className="trade-v2-currency">Notional</span>
      </div>

      {market.title && (
        <p className="trade-v2-market-title">{market.title}</p>
      )}

      <div className="trade-v2-outcomes">
        {(['YES', 'NO'] as const).map((o) => {
          const cents = o === 'YES' ? market.yesCents : market.noCents;
          const heldQty = o === 'YES' ? heldYes : heldNo;
          const selected = outcome === o;
          return (
            <button
              key={o}
              type="button"
              className={`trade-v2-pill ${o.toLowerCase()} ${selected ? 'selected' : ''}`}
              onClick={() => setOutcome(o)}
            >
              <span className="trade-v2-pill-label">{o}</span>
              <span className="trade-v2-pill-price tabular">{cents}¢</span>
              {side === 'SELL' && heldQty > 0 && (
                <span className="trade-v2-pill-held tabular">{formatContracts(heldQty)} held</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="trade-v2-amount-box">
        <span className="trade-v2-amount-label">
          {side === 'BUY' ? 'Notional' : 'Receive'}
        </span>
        <div className="trade-v2-amount-input-wrap">
          <input
            className="trade-v2-amount-input tabular"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={notionalInput}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*\.?\d*$/.test(v)) applyNotionalInput(v);
            }}
          />
          <span className="trade-v2-amount-suffix">N</span>
        </div>
      </div>

      <div className="trade-v2-slider-wrap">
        <input
          type="range"
          className="trade-v2-slider"
          min={0}
          max={SLIDER_STEPS}
          value={Math.round((sliderPct / 100) * SLIDER_STEPS)}
          onChange={(e) => applySlider((Number(e.target.value) / SLIDER_STEPS) * 100)}
          disabled={maxNotional <= 0}
        />
        <div className="trade-v2-slider-labels">
          <span>0</span>
          <span className="tabular">
            {side === 'SELL' && held > 0
              ? `${formatContracts((sliderPct / 100) * held)} contracts`
              : `${sliderPct.toFixed(0)}%`}
          </span>
          <span className="tabular">
            {side === 'SELL'
              ? formatContracts(held)
              : `${formatNotional(Math.round(maxNotional))} N`}
          </span>
        </div>
      </div>

      {contracts > 0 && preview && (
        <div className="trade-v2-contracts-hint tabular">
          ≈ {formatContracts(contracts)} contracts @ {preview.avgPriceCents}¢
        </div>
      )}

      <div className="trade-v2-stats">
        <div className="trade-v2-stat-row">
          <span className="trade-v2-stat-label">Odds</span>
          <span className="trade-v2-stat-value tabular">{Math.round(oddsPercent)}% chance</span>
        </div>
        <div className="trade-v2-stat-row highlight">
          <div>
            <span className="trade-v2-stat-label">
              {side === 'BUY' ? 'Max payout' : 'You receive'}
            </span>
            {closeDate && side === 'BUY' && (
              <span className="trade-v2-stat-sub">{closeDate}</span>
            )}
          </div>
          <span className="trade-v2-stat-payout tabular">
            {formatNotional(Math.round(payout))} N
          </span>
        </div>
        {side === 'BUY' && contracts > 0 && preview && (
          <div className="trade-v2-stat-row">
            <span className="trade-v2-stat-label">Profit if right</span>
            <span className="trade-v2-stat-value tabular yes-text">
              +{formatNotional(Math.round(maxPayout(contracts) - preview.costNotional))} N
            </span>
          </div>
        )}
        {realizedPnl != null && (
          <div className="trade-v2-stat-row">
            <span className="trade-v2-stat-label">Realized P&L</span>
            <span
              className={`trade-v2-stat-value tabular ${realizedPnl >= 0 ? 'yes-text' : 'no-text'}`}
            >
              {realizedPnl >= 0 ? '+' : ''}
              {formatNotional(Math.round(realizedPnl * 100) / 100)} N
            </span>
          </div>
        )}
        {preview && preview.priceImpactCents > SLIPPAGE_WARNING_CENTS && (
          <div className="trade-v2-stat-row warn">
            <span className="trade-v2-stat-label">Price impact</span>
            <span className="trade-v2-stat-value tabular">{preview.priceImpactCents}¢</span>
          </div>
        )}
      </div>

      {validation && <p className="trade-error">{validation}</p>}

      <button
        type="button"
        className={`trade-v2-submit ${outcome === 'YES' ? 'yes' : 'no'}`}
        disabled={!canTrade}
        onClick={executeTrade}
      >
        {executing
          ? 'Processing…'
          : side === 'BUY'
            ? `Buy ${outcome} · ${formatNotional(Math.round(preview?.costNotional ?? notional))} N`
            : `Sell ${formatContracts(contracts)} ${outcome}`}
      </button>

      {msg && (
        <p className={msg.includes('Bought') || msg.includes('Sold') ? 'trade-success' : 'trade-error'}>
          {msg}
        </p>
      )}

      {balance != null && (
        <p className="trade-balance-hint">
          Balance · <span className="tabular">{formatNotional(balance)} N</span>
        </p>
      )}
    </div>
  );
}
