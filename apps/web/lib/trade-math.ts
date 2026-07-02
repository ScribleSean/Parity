import {
  MAX_TRADE_NOTIONAL,
  MIN_TRADE_NOTIONAL,
  SETTLEMENT_PAYOUT_PER_CONTRACT,
  quoteBuy,
  quoteSell,
  type LmsrState,
  type TradeOutcome,
} from '@parity/shared';

export function contractsForBuyNotional(
  state: LmsrState,
  outcome: TradeOutcome,
  targetNotional: number,
): number {
  if (targetNotional <= 0) return 0;
  let hi = 1;
  while (hi < 2_000_000 && quoteBuy(state, outcome, hi).costNotional < targetNotional) {
    hi *= 2;
  }
  let lo = 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) / 2;
    if (quoteBuy(state, outcome, mid).costNotional <= targetNotional) lo = mid;
    else hi = mid - 0.000001;
  }
  return Math.round(lo * 10000) / 10000;
}

export function contractsForSellNotional(
  state: LmsrState,
  outcome: TradeOutcome,
  targetProceeds: number,
  maxHeld: number,
): number {
  if (targetProceeds <= 0 || maxHeld <= 0) return 0;
  let hi = maxHeld;
  let lo = 0;
  while (lo < hi) {
    const mid = (lo + hi + 0.0001) / 2;
    if (quoteSell(state, outcome, mid).costNotional <= targetProceeds) lo = mid;
    else hi = mid - 0.0001;
  }
  return Math.round(Math.min(lo, maxHeld) * 10000) / 10000;
}

export function maxBuyNotional(
  state: LmsrState,
  outcome: TradeOutcome,
  balance: number,
): number {
  const cap = Math.min(balance, MAX_TRADE_NOTIONAL);
  let hi = 1;
  while (hi < 2_000_000 && quoteBuy(state, outcome, hi).costNotional < cap) {
    hi *= 2;
  }
  let lo = 0;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (quoteBuy(state, outcome, mid).costNotional <= cap) lo = mid;
    else hi = mid - 1;
  }
  return quoteBuy(state, outcome, lo).costNotional;
}

export function maxSellNotional(
  state: LmsrState,
  outcome: TradeOutcome,
  held: number,
): number {
  if (held <= 0) return 0;
  return quoteSell(state, outcome, held).costNotional;
}

export function previewTrade(
  state: LmsrState,
  side: 'BUY' | 'SELL',
  outcome: TradeOutcome,
  contracts: number,
) {
  if (contracts <= 0) return null;
  return side === 'BUY'
    ? quoteBuy(state, outcome, contracts)
    : quoteSell(state, outcome, contracts);
}

export function maxPayout(contracts: number): number {
  return contracts * SETTLEMENT_PAYOUT_PER_CONTRACT;
}

export function parseNotionalInput(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function formatContracts(n: number): string {
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  if (n > 0) return n.toFixed(4);
  return '0';
}

export { MIN_TRADE_NOTIONAL, MAX_TRADE_NOTIONAL };
