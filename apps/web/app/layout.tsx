import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Nav, Footer } from '@/components/layout';
import { MainShell } from '@/components/MainShell';
import { WalletProvider } from '@/lib/wallet-context';
import './globals.css';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Parity — Markets find parity.',
  description: 'Fake-money prediction markets with live odds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <WalletProvider>
          <Nav />
          <MainShell>{children}</MainShell>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
