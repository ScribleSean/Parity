'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from './api';
import { BALANCE_CHANGED } from './format';

interface UserInfo {
  username: string;
  role: string;
}

interface WalletContextValue {
  balance: number | null;
  user: UserInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  balance: null,
  user: null,
  loading: true,
  refresh: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [me, wallet] = await Promise.all([
        api<{ username: string; role: string }>('/users/me'),
        api<{ balance: number }>('/wallet'),
      ]);
      setUser({ username: me.username, role: me.role });
      setBalance(wallet.balance);
    } catch {
      setUser(null);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const onBalanceChanged = () => refresh();
    window.addEventListener(BALANCE_CHANGED, onBalanceChanged);
    window.addEventListener('focus', onBalanceChanged);
    const interval = setInterval(refresh, 15000);

    return () => {
      window.removeEventListener(BALANCE_CHANGED, onBalanceChanged);
      window.removeEventListener('focus', onBalanceChanged);
      clearInterval(interval);
    };
  }, [refresh]);

  return (
    <WalletContext.Provider value={{ balance, user, loading, refresh }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
