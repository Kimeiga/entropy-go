export type Player = 'black' | 'white';

export interface Point {
    row: number;
    col: number;
}

export interface Stone {
    color: Player;
    health: number;
    isPetrified: boolean;
    id: string; // Unique ID for React keys and animation tracking
}

export interface BoardState {
    grid: (Stone | null)[][]; // 9x9 grid
    turn: Player;
    turnCount: number;
    prisoners: { black: number; white: number }; // Stones captured
    gameStatus: 'playing' | 'black_won' | 'white_won';
    lastMove: Point | null; // For highlighting
}

export const BOARD_SIZE = 9;
