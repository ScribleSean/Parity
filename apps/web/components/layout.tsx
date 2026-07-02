'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatNotional } from '@/lib/format';
import { useWallet } from '@/lib/wallet-context';

export function Nav() {
  const pathname = usePathname();
  const { balance, user, loading } = useWallet();
  const isLanding = pathname === '/';

  return (
    <header className={`nav ${isLanding ? 'nav-landing' : ''}`}>
      <div className="container nav-inner">
        <Link href="/" className="nav-logo">
          Parity
        </Link>
        <nav className="nav-links">
          <Link href="/markets">Markets</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          {user && <Link href="/portfolio">Portfolio</Link>}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <Link href="/wallet" className="balance-pill tabular" title="Notional balance">
                <span className="balance-label">N</span>
                <span className="balance-value">
                  {loading || balance === null ? '—' : formatNotional(balance)}
                </span>
              </Link>
              <Link href="/profile" className="nav-user">
                {user.username}
              </Link>
              {user.role === 'ADMIN' && <Link href="/admin">Admin</Link>}
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <footer className="site-footer">
      <div className="container disclaimer">
        <p>Notional is simulated currency. No real money. No prizes with cash value.</p>
        <p style={{ marginTop: 8 }}>Markets find parity.</p>
      </div>
    </footer>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'OPEN'
      ? 'badge-open'
      : status === 'CLOSED'
        ? 'badge-closed'
        : 'badge-resolved';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function PriceBar({ yesCents }: { yesCents: number }) {
  return (
    <div className="price-bar">
      <div className="price-bar-fill" style={{ width: `${yesCents}%` }} />
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="container page-container">{children}</div>;
}
