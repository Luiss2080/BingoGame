import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { LocksService } from './locks.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly locksService: LocksService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1] || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }
      
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Al desconectarse podríamos limpiar los locks que tenía este cliente si tuvieramos registro por sessionId, 
    // pero con TTL es suficiente.
  }

  @SubscribeMessage('carton:tap')
  async handleCartonTap(client: Socket, payload: { cartonId: number }) {
    if (!client.data.user) return;
    
    const lockKey = `lock:carton:${payload.cartonId}`;
    const acquired = await this.locksService.acquireLock(lockKey, client.data.user.sub, 15);
    
    if (acquired) {
      // Emitir a los demás clientes que el cartón está bloqueado
      this.server.emit('carton:bloqueado_temporal', {
        cartonId: payload.cartonId,
        lockedBy: client.data.user.sub,
        expiresIn: 15, // 15 segundos
      });
    } else {
      // Notificar al cliente que ya está bloqueado
      client.emit('carton:bloqueo_fallido', { cartonId: payload.cartonId });
    }
  }

  emitCartonReservado(cartonId: number) {
    this.server.emit('carton:reservado', { cartonId });
  }

  emitCartonVendido(cartonId: number) {
    this.server.emit('carton:vendido', { cartonId });
  }

  emitCartonLiberado(cartonId: number) {
    this.server.emit('carton:liberado', { cartonId });
  }
}
