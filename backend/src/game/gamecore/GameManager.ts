import { TurnValidator } from './TurnValidator';
import { TurnResult, CellCoordinate, GameState } from './Types';

export class GameManager {
  static createGame(id: string, size: number, diamonds: number): GameState {
    const diamondPositions = this.generateDiamonds(size, diamonds);

    return {
      id,
      size,
      diamondAmount: diamonds,
      diamondPositions,
      currentPlayerIndex: 0,
      players: [],
      openedDiamonds: [],
    };
  }

  static applyTurn(
    game: GameState,
    playerId: string,
    coordinate: CellCoordinate,
  ): TurnResult | undefined {
    const validation = TurnValidator.validateTurn(game, coordinate);
    if (!validation) {
      return;
    }

    if (!game.players.includes(playerId)) {
      game.players.push(playerId);
    }

    const hitDiamond = game.diamondPositions.some(
      (cell) => cell.x === coordinate.x && cell.y === coordinate.y,
    );

    let adjacentDiamonds = 0;
    if (!hitDiamond) {
      adjacentDiamonds = this.emptyCellHit(coordinate, game);
    } else {
      if (!game.openedDiamonds.includes(coordinate)) {
        game.openedDiamonds.push(coordinate);
      }
    }

    if (this.hasWinner(game)) {
      game.winnerId = playerId;
    }

    const currentIndex = game.players.indexOf(playerId);
    game.currentPlayerIndex = (currentIndex + 1) % game.players.length;

    const nextPlayerId = game.players[game.currentPlayerIndex];
    game.nextPlayerId = nextPlayerId;

    return {
      hitDiamond,
      adjacentDiamonds,
      winnerId: game.winnerId,
      gameOver: !!game.winnerId,
      nextPlayerId,
    };
  }

  private static emptyCellHit(
    coordinate: CellCoordinate,
    game: GameState,
  ): number {
    let adjacentDiamonds = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const nx = coordinate.x + dx;
        const ny = coordinate.y + dy;

        if (nx < 0 || ny < 0 || nx >= game.size || ny >= game.size) continue;

        const neighborHasDiamond = game.diamondPositions.some(
          (cell) => cell.x === nx && cell.y === ny,
        );

        if (neighborHasDiamond) {
          adjacentDiamonds++;
        }
      }
    }

    return adjacentDiamonds;
  }

  private static hasWinner(game: GameState): boolean {
    if (
      game.openedDiamonds.length === game.diamondPositions.length &&
      !game.winnerId
    ) {
      return true;
    }

    return false;
  }

  private static generateDiamonds(
    size: number,
    diamonds: number,
  ): CellCoordinate[] {
    const positions: CellCoordinate[] = [];

    while (positions.length < diamonds) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      positions.push({ x, y });
    }

    return positions;
  }
}
