export type TurnResult = {
  hitDiamond: boolean;
  adjacentDiamonds: number;
  winnerId?: string;
  gameOver: boolean;
  nextPlayerId?: string;
};

export type CellCoordinate = {
  x: number;
  y: number;
};

export type GameState = {
  id: string;
  size: number;
  diamondAmount: number;
  diamondPositions: CellCoordinate[];
  currentPlayerIndex: number;
  nextPlayerId?: string;
  players: string[];
  openedDiamonds: CellCoordinate[];
  winnerId?: string;
};

export type GameStatus = {
  hitDiamond: boolean;
  adjacentDiamonds: number;
  winnerId?: string;
  gameOver: boolean;
  nextPlayerId?: string;
};
