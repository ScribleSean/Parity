'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get('ok')) {
      router.replace('/');
    } else {
      router.replace('/login?error=1');
    }
  }, [params, router]);

  return <p style={{ color: 'var(--text-muted)' }}>Signing in...</p>;
}
