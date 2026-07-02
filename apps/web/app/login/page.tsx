import { authUrl } from '@/lib/api';

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Sign in to Parity</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Trade prediction markets with simulated Notional currency.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        <a href={authUrl('/auth/google')} className="btn" style={{ textAlign: 'center', display: 'block' }}>
          Continue with Google
        </a>
        <a href={authUrl('/auth/apple')} className="btn btn-ghost" style={{ textAlign: 'center', display: 'block' }}>
          Continue with Apple
        </a>
        <a href={authUrl('/auth/dev/login?admin=1')} className="btn btn-ghost" style={{ textAlign: 'center', display: 'block' }}>
          Dev admin login (local)
        </a>
        <a href={authUrl('/auth/dev/login')} className="btn btn-ghost" style={{ textAlign: 'center', display: 'block' }}>
          Dev user login (local)
        </a>
      </div>
      <p className="disclaimer" style={{ marginTop: 24 }}>
        Notional is simulated currency. No real money. No prizes with cash value.
      </p>
    </div>
  );
}
