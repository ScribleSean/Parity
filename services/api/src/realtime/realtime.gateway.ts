import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from '../common/auth.guard';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string);
    if (token) {
      try {
        const user = this.jwtService.verify<AuthUser>(token);
        client.join(`user:${user.sub}`);
        (client.data as { user: AuthUser }).user = user;
      } catch {
        // guest connection allowed
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { channel: string; slug?: string },
  ) {
    if (body.channel === 'market' && body.slug) {
      client.join(`market:${body.slug}`);
    }
    if (body.channel === 'leaderboard') {
      client.join('leaderboard');
    }
    if (body.channel === 'user') {
      const user = (client.data as { user?: AuthUser }).user;
      if (user) client.join(`user:${user.sub}`);
    }
    return { ok: true };
  }
}
