import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:user')
  handleJoinUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      const room = `user:${data.userId}`;
      void client.join(room);
      this.logger.log(`Client ${client.id} joined ${room}`);
      return { status: 'ok', room };
    }
    return { status: 'error', message: 'Missing userId' };
  }

  @SubscribeMessage('join:project')
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    if (data?.projectId) {
      const room = `project:${data.projectId}`;
      void client.join(room);
      this.logger.log(`Client ${client.id} joined ${room}`);
      return { status: 'ok', room };
    }
    return { status: 'error', message: 'Missing projectId' };
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    if (data?.projectId) {
      const room = `project:${data.projectId}`;
      void client.leave(room);
      return { status: 'ok' };
    }
    return { status: 'error', message: 'Missing projectId' };
  }

  notifyUser(userId: string, notification: unknown) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  broadcastTaskUpdate(projectId: string, update: unknown) {
    if (!this.server) return;
    this.server.to(`project:${projectId}`).emit('task:updated', update);
  }
}
