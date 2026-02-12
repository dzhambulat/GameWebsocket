import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateGameDto } from './dto/create-game.dto';
import type { CellCoordinate, GameState, GameStatus } from './gamecore/Types';
import { GameManager } from './gamecore/GameManager';

@Injectable()
export class GameSessionService {
  private games = new Map<string, GameState>();

  createGame({ size, diamonds }: CreateGameDto): GameState {
    const id = randomUUID();
    const game = GameManager.createGame(id, size, diamonds);

    this.games.set(id, game);
    return game;
  }

  getGame(id: string): GameState | undefined {
    return this.games.get(id);
  }

  registerPlayer(gameId: string, playerId: string): GameState | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    if (!game.players.includes(playerId)) {
      game.players.push(playerId);
    }

    return game;
  }

  handleTurn(
    gameId: string,
    playerId: string,
    coordinate: CellCoordinate,
  ): GameStatus | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    const turnResult = GameManager.applyTurn(game, playerId, coordinate);

    if (!turnResult) {
      return;
    }

    return turnResult;
  }
}
