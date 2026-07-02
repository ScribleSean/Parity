'use client';

import { Suspense } from 'react';
import AuthCallbackInner from './AuthCallbackInner';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-muted)' }}>Signing in...</p>}>
      <AuthCallbackInner />
    </Suspense>
  );
}
