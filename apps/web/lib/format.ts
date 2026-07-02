/** Format Notional balance with full precision (up to 2 decimal places). */
export function formatNotional(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  const rounded = Math.round(amount * 100) / 100;
  const isWhole = rounded % 1 === 0;
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export const BALANCE_CHANGED = 'parity:balance-changed';

export function notifyBalanceChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BALANCE_CHANGED));
  }
}
