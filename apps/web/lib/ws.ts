import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      auth: token ? { token } : {},
      transports: ['websocket'],
    });
  }
  return socket;
}

export function subscribeMarket(slug: string, onOdds: (data: unknown) => void) {
  const s = getSocket();
  s.emit('subscribe', { channel: 'market', slug });
  s.on('market.odds', onOdds);
  return () => {
    s.off('market.odds', onOdds);
  };
}
