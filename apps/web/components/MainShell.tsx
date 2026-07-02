'use client';

import { usePathname } from 'next/navigation';

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) return <>{children}</>;

  return <div className="container page-container">{children}</div>;
}
