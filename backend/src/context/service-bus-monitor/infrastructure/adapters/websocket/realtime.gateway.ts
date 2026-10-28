import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { EntityTarget } from '../../../domain/entities/event-message.entity.js';
import { StreamActiveMessagesUseCase } from '../../../application/use-cases/stream-active-messages.use-case.js';

@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly intervals = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly streamMessages: StreamActiveMessagesUseCase) {}

  handleConnection(client: Socket): void {
    client.emit('connected', { connected: true });
  }

  handleDisconnect(client: Socket): void {
    this.stopWatching(client.id);
  }

  @SubscribeMessage('watch')
  watch(
    @ConnectedSocket() client: Socket,
    @MessageBody() target: EntityTarget,
  ): void {
    this.stopWatching(client.id);
    void this.poll(client, target);
  }

  private async poll(client: Socket, target: EntityTarget): Promise<void> {
    if (!client.connected) return;
    try {
      const messages = await this.streamMessages.execute(target);
      client.emit('messages', messages);
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Unable to stream messages',
      });
      return;
    }
    if (client.connected) {
      this.intervals.set(
        client.id,
        setTimeout(() => void this.poll(client, target), 3000),
      );
    }
  }

  private stopWatching(clientId: string): void {
    const timer = this.intervals.get(clientId);
    if (timer) clearTimeout(timer);
    this.intervals.delete(clientId);
  }
}
