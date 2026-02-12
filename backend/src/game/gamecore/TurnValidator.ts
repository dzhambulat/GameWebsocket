import type { CellCoordinate, GameState } from './Types';

export class TurnValidator {
  static validateTurn(game: GameState, coordinate: CellCoordinate): boolean {
    if (game.winnerId) {
      return false;
    }
    // more then 1 players
    if (game.players.length < 2) {
      return false;
    }

    // check for bounds
    if (
      coordinate.x < 0 ||
      coordinate.y < 0 ||
      coordinate.x >= game.size ||
      coordinate.y >= game.size
    ) {
      return false;
    }

    return true;
  }
}
