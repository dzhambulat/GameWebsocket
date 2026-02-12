import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameSessionService } from './game.session.service';
import type { CellCoordinate } from './gamecore/Types';

type TurnPayload = {
  gameId: string;
  playerId: string;
  x: number;
  y: number;
};

type JoinPayload = {
  gameId: string;
  playerId: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly gameService: GameSessionService) {}

  @SubscribeMessage('turn')
  handleTurn(
    @MessageBody() payload: TurnPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { gameId, playerId, x, y } = payload;

    const turnResult = this.gameService.handleTurn(gameId, playerId, {
      x,
      y,
    } as CellCoordinate);

    if (!turnResult) {
      client.emit('turn:error', { message: 'Invalid coordinates' });
      return;
    }

    this.server.to(gameId).emit('turn:result', {
      gameId,
      playerId,
      x,
      y,
      ...turnResult,
    });
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() payload: JoinPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { gameId, playerId } = payload;
    const game = this.gameService.registerPlayer(gameId, playerId);

    if (!game) {
      client.emit('join:error', { message: 'Game not found' });
      return;
    }

    client.join(gameId);
    const joinPayload = {
      gameId: game.id,
      size: game.size,
      diamonds: game.diamondAmount,
      players: game.players,
      winnerId: game.winnerId,
      currentPlayerId:
        game.players.length > 0 ? game.players[game.currentPlayerIndex] : null,
    };

    client.emit('join:ok', joinPayload);

    this.server.to(gameId).emit('game:players', {
      gameId: game.id,
      players: game.players,
    });
  }
}
