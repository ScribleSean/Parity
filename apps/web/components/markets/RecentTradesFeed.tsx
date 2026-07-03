'use client';

export interface RecentTrade {
  outcome: string;
  side: string;
  quantity: number;
  priceCents: number;
  username: string;
  createdAt: string;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function formatPrice(cents: number): string {
  const rounded = Math.round(cents * 10) / 10;
  return rounded % 1 === 0 ? `${rounded}¢` : `${rounded.toFixed(1)}¢`;
}

function actionLabel(side: string, outcome: string): { verb: string; outcome: string } {
  const isYes = outcome.toUpperCase() === 'YES';
  const outcomeLabel = isYes ? 'Yes' : 'No';
  const verb = side.toUpperCase() === 'SELL' ? 'Sold' : 'Bought';
  return { verb, outcome: outcomeLabel };
}

function TradeIcon({ outcome }: { outcome: string }) {
  const isYes = outcome.toUpperCase() === 'YES';
  return (
    <span
      className={`activity-trade-icon ${isYes ? 'activity-trade-icon--yes' : 'activity-trade-icon--no'}`}
      aria-hidden
    />
  );
}

export function RecentTradesFeed({
  trades,
}: {
  trades: RecentTrade[];
}) {
  return (
    <section className="activity-feed">
      <header className="activity-feed-header">
        <h2 className="activity-feed-title">
          <span className="activity-feed-title-muted">Recent</span>{' '}
          <span>Activity</span>
        </h2>
      </header>

      {trades.length === 0 ? (
        <p className="activity-feed-empty">No trades yet.</p>
      ) : (
        <ul className="activity-feed-list">
          {trades.map((t, i) => {
            const { verb, outcome } = actionLabel(t.side, t.outcome);
            const isBuy = t.side.toUpperCase() === 'BUY';
            return (
              <li key={`${t.createdAt}-${i}`} className="activity-feed-item">
                <div className="activity-feed-meta">
                  <span className="activity-feed-user">{t.username}</span>
                  <time className="activity-feed-time" dateTime={t.createdAt}>
                    {formatRelativeTime(t.createdAt)}
                  </time>
                </div>
                <div className="activity-feed-action">
                  <TradeIcon outcome={t.outcome} />
                  <p className="activity-feed-action-text">
                    <span
                      className={
                        isBuy
                          ? 'activity-feed-verb activity-feed-verb--buy'
                          : 'activity-feed-verb activity-feed-verb--sell'
                      }
                    >
                      {verb} {outcome}
                    </span>
                  </p>
                </div>
                <p className="activity-feed-detail tabular">
                  {t.quantity.toLocaleString()} contracts ({formatPrice(t.priceCents)})
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
