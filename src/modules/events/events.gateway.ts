import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket): void {
    const clinicId = client.handshake.auth?.clinicId as string | undefined;

    if (!clinicId) {
      client.disconnect(true);
      return;
    }

    void client.join(`clinic:${clinicId}`);
    this.logger.log(`Client ${client.id} joined clinic:${clinicId}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  emitToClinic(clinicId: string, event: string, payload: unknown): void {
    this.server.to(`clinic:${clinicId}`).emit(event, payload);
  }
}
