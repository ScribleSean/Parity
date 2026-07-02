export const SIGNUP_BONUS_NOTIONAL = 100_000;
export const REFILL_TARGET_NOTIONAL = 10_000;
export const REFILL_THRESHOLD_NOTIONAL = 100;
export const FREE_REFILLS_PER_MONTH = 4;
export const AD_REFILLS_PER_DAY = 10;
export const TOTAL_REFILLS_PER_DAY = 10;
export const MIN_TRADE_NOTIONAL = 10;
export const MAX_TRADE_NOTIONAL = 50_000;
export const QUOTE_TTL_MS = 10_000;
export const DEFAULT_LIQUIDITY_PARAM = 1000;
export const SLIPPAGE_WARNING_CENTS = 2;
export const SETTLEMENT_PAYOUT_PER_CONTRACT = 100;
export const LEADERBOARD_MIN_SETTLED_MARKETS = 3;

export const MARKET_CATEGORIES = [
  'Politics',
  'Sports',
  'Culture',
  'Business',
  'Science',
  'Other',
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const MARKET_STATUSES = [
  'DRAFT',
  'OPEN',
  'CLOSED',
  'RESOLVED',
  'VOID',
] as const;

export type MarketStatus = (typeof MARKET_STATUSES)[number];

export const MARKET_RESOLUTIONS = ['YES', 'NO', 'VOID'] as const;
export type MarketResolution = (typeof MARKET_RESOLUTIONS)[number];

export const TRADE_SIDES = ['BUY', 'SELL'] as const;
export type TradeSide = (typeof TRADE_SIDES)[number];

export const TRADE_OUTCOMES = ['YES', 'NO'] as const;
export type TradeOutcome = (typeof TRADE_OUTCOMES)[number];

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LEDGER_TYPES = [
  'SIGNUP_BONUS',
  'REFILL_FREE',
  'REFILL_AD',
  'REFILL_PREMIUM',
  'TRADE_BUY',
  'TRADE_SELL',
  'SETTLEMENT_WIN',
  'ADMIN_ADJUSTMENT',
] as const;

export type LedgerType = (typeof LEDGER_TYPES)[number];

export const OAUTH_PROVIDERS = ['google', 'apple', 'dev'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
