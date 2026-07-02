import type { TradeOutcome } from './constants';

export interface LmsrState {
  qYes: number;
  qNo: number;
  b: number;
}

export interface LmsrPrices {
  yesPrice: number;
  noPrice: number;
  yesCents: number;
  noCents: number;
}

export interface LmsrQuoteResult {
  costNotional: number;
  avgPriceCents: number;
  priceImpactCents: number;
  newState: LmsrState;
  newPrices: LmsrPrices;
}

function logSumExp(qYes: number, qNo: number, b: number): number {
  const a = qYes / b;
  const c = qNo / b;
  const max = Math.max(a, c);
  return max + Math.log(Math.exp(a - max) + Math.exp(c - max));
}

/** LMSR cost function C(q) = b * ln(exp(q_yes/b) + exp(q_no/b)) */
export function lmsrCost(qYes: number, qNo: number, b: number): number {
  return b * logSumExp(qYes, qNo, b);
}

export function getPrices(state: LmsrState): LmsrPrices {
  const { qYes, qNo, b } = state;
  const expYes = Math.exp(qYes / b);
  const expNo = Math.exp(qNo / b);
  const yesPrice = expYes / (expYes + expNo);
  const noPrice = 1 - yesPrice;
  return {
    yesPrice,
    noPrice,
    yesCents: Math.round(yesPrice * 1000) / 10,
    noCents: Math.round(noPrice * 1000) / 10,
  };
}

export function quoteBuy(
  state: LmsrState,
  outcome: TradeOutcome,
  quantity: number,
): LmsrQuoteResult {
  const before = lmsrCost(state.qYes, state.qNo, state.b);
  const newState: LmsrState = { ...state };
  if (outcome === 'YES') newState.qYes += quantity;
  else newState.qNo += quantity;
  const after = lmsrCost(newState.qYes, newState.qNo, newState.b);
  const costNotional = Math.round((after - before) * 100) / 100;
  const pricesBefore = getPrices(state);
  const pricesAfter = getPrices(newState);
  const midBefore =
    outcome === 'YES' ? pricesBefore.yesCents : pricesBefore.noCents;
  const avgPriceCents =
    quantity > 0 ? Math.round((costNotional / quantity) * 1000) / 10 : 0;
  return {
    costNotional,
    avgPriceCents,
    priceImpactCents: Math.round((avgPriceCents - midBefore) * 10) / 10,
    newState,
    newPrices: pricesAfter,
  };
}

export function quoteSell(
  state: LmsrState,
  outcome: TradeOutcome,
  quantity: number,
): LmsrQuoteResult {
  const before = lmsrCost(state.qYes, state.qNo, state.b);
  const newState: LmsrState = { ...state };
  if (outcome === 'YES') newState.qYes -= quantity;
  else newState.qNo -= quantity;
  const after = lmsrCost(newState.qYes, newState.qNo, newState.b);
  const costNotional = Math.round((before - after) * 100) / 100;
  const pricesBefore = getPrices(state);
  const pricesAfter = getPrices(newState);
  const midBefore =
    outcome === 'YES' ? pricesBefore.yesCents : pricesBefore.noCents;
  const avgPriceCents =
    quantity > 0 ? Math.round((costNotional / quantity) * 1000) / 10 : 0;
  return {
    costNotional,
    avgPriceCents,
    priceImpactCents: Math.round((midBefore - avgPriceCents) * 10) / 10,
    newState,
    newPrices: pricesAfter,
  };
}

export function anonymizeUsername(username: string): string {
  if (username.length <= 2) return '**';
  return `${username.slice(0, 2)}***${username.slice(-1)}`;
}

export function monthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
