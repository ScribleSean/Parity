'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNotional } from '@/lib/format';

export interface OddsHistoryPoint {
  ts: string;
  yesCents: number;
  noCents: number;
  volume?: number;
}

type Timeframe = 'LIVE' | '1D' | '1W' | '1M' | 'ALL';

const TIMEFRAMES: Timeframe[] = ['LIVE', '1D', '1W', '1M', 'ALL'];

const TF_MS: Record<Exclude<Timeframe, 'ALL'>, number> = {
  LIVE: 6 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
};

function formatAxisTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatTooltipTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function filterHistory(data: OddsHistoryPoint[], tf: Timeframe): OddsHistoryPoint[] {
  if (data.length === 0) return [];
  if (tf === 'ALL') return data;

  const cutoff = Date.now() - TF_MS[tf];
  const filtered = data.filter((d) => new Date(d.ts).getTime() >= cutoff);
  if (filtered.length >= 2) return filtered;
  return data.slice(-Math.min(data.length, 40));
}

function downsample(data: OddsHistoryPoint[], maxPoints = 120): OddsHistoryPoint[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: OddsHistoryPoint }>;
}

function OddsTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="odds-chart-tooltip">
      <div className="odds-chart-tooltip-time">{formatTooltipTime(pt.ts)}</div>
      <div className="odds-chart-tooltip-row yes">
        <span>YES</span>
        <span className="tabular">{pt.yesCents.toFixed(1)}¢</span>
        <span className="tabular muted">{Math.round(pt.yesCents)}%</span>
      </div>
      <div className="odds-chart-tooltip-row no">
        <span>NO</span>
        <span className="tabular">{pt.noCents.toFixed(1)}¢</span>
        <span className="tabular muted">{Math.round(pt.noCents)}%</span>
      </div>
    </div>
  );
}

export function MarketOddsChart({
  history,
  yesCents,
  noCents,
  volume,
}: {
  history: OddsHistoryPoint[];
  yesCents: number;
  noCents: number;
  volume: number;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>('ALL');
  const [series, setSeries] = useState<OddsHistoryPoint[]>(history);

  useEffect(() => {
    setSeries(history);
  }, [history]);

  useEffect(() => {
    setSeries((prev) => {
      if (prev.length === 0) {
        return [{ ts: new Date().toISOString(), yesCents, noCents }];
      }
      const last = prev[prev.length - 1];
      const changed =
        Math.abs(last.yesCents - yesCents) > 0.05 || Math.abs(last.noCents - noCents) > 0.05;
      const stale = Date.now() - new Date(last.ts).getTime() > 8000;
      if (!changed && !stale) return prev;
      return [...prev, { ts: new Date().toISOString(), yesCents, noCents }];
    });
  }, [yesCents, noCents]);

  const chartData = useMemo(() => {
    const filtered = filterHistory(series, timeframe);
    return downsample(
      filtered.map((d) => ({
        ...d,
        noCents: d.noCents ?? 100 - d.yesCents,
      })),
    );
  }, [series, timeframe]);

  const yesDelta = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].yesCents;
    return Math.round((yesCents - first) * 10) / 10;
  }, [chartData, yesCents]);

  const tickInterval = Math.max(1, Math.floor(chartData.length / 5));

  return (
    <div className="odds-chart-card">
      <div className="odds-chart-header">
        <span className="odds-chart-title">Chance</span>
        <div className="odds-chart-live-labels">
          <span className="odds-live-tag yes tabular">
            YES {yesCents.toFixed(1)}%
            {yesDelta !== 0 && (
              <span className={`odds-delta ${yesDelta > 0 ? 'up' : 'down'}`}>
                {yesDelta > 0 ? '▲' : '▼'} {Math.abs(yesDelta)}
              </span>
            )}
          </span>
          <span className="odds-live-tag no tabular">
            NO {noCents.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="odds-chart-body">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 52, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="yesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="noAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
              strokeDasharray="3 6"
            />

            <XAxis
              dataKey="ts"
              tickFormatter={formatAxisTime}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              minTickGap={40}
            />

            <YAxis
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              ticks={[0, 25, 50, 75, 100]}
            />

            <Tooltip
              content={<OddsTooltip />}
              cursor={{
                stroke: 'rgba(255,255,255,0.18)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            <Area
              type="monotone"
              dataKey="yesCents"
              stroke="none"
              fill="url(#yesAreaGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="noCents"
              stroke="none"
              fill="url(#noAreaGrad)"
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="yesCents"
              stroke="#34d399"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="noCents"
              stroke="#f87171"
              strokeWidth={2}
              dot={false}
              strokeOpacity={0.9}
              activeDot={{ r: 4, fill: '#f87171', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="odds-chart-end-labels">
          <span
            className="odds-end-label yes tabular"
            style={{ top: `calc(${100 - yesCents}% - 10px)` }}
          >
            {yesCents.toFixed(1)}%
          </span>
          <span
            className="odds-end-label no tabular"
            style={{ top: `calc(${100 - noCents}% - 10px)` }}
          >
            {noCents.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="odds-chart-footer">
        <span className="odds-chart-volume tabular">
          {formatNotional(volume)} N <span className="muted">vol</span>
        </span>
        <div className="odds-chart-tf">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              className={`odds-tf-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
