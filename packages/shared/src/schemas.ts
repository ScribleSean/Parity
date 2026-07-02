import { z } from 'zod';
import {
  MARKET_CATEGORIES,
  MARKET_RESOLUTIONS,
  MARKET_STATUSES,
  TRADE_OUTCOMES,
  TRADE_SIDES,
} from './constants';

export const quoteRequestSchema = z.object({
  side: z.enum(TRADE_SIDES),
  outcome: z.enum(TRADE_OUTCOMES),
  quantity: z.number().positive(),
});

export const tradeExecuteSchema = z.object({
  quoteId: z.string().uuid(),
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const createMarketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(MARKET_CATEGORIES),
  imageUrl: z.string().url().optional().nullable(),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  liquidityParam: z.number().positive().default(1000),
});

export const updateMarketSchema = createMarketSchema.partial();

export const resolveMarketSchema = z.object({
  resolution: z.enum(MARKET_RESOLUTIONS),
  resolutionNote: z.string().max(2000).optional(),
});

export const marketsQuerySchema = z.object({
  status: z.enum(MARKET_STATUSES).optional(),
  category: z.enum(MARKET_CATEGORIES).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const leaderboardQuerySchema = z.object({
  period: z.enum(['weekly', 'alltime']).default('alltime'),
});

export const refillRequestSchema = z.object({
  source: z.enum(['FREE', 'AD', 'PREMIUM']).default('FREE'),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type TradeExecute = z.infer<typeof tradeExecuteSchema>;
export type CreateMarketInput = z.infer<typeof createMarketSchema>;
export type ResolveMarketInput = z.infer<typeof resolveMarketSchema>;
