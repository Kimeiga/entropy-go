import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { BoardState, Stone, Point } from '../types';
import { BOARD_SIZE } from '../types';
import { getGroup, countLiberties, checkPetrification, isValidPoint } from '../utils/goLogic';

interface GameStore extends BoardState {
    placeStone: (row: number, col: number) => void;
    passTurn: () => void;
    resetGame: () => void;
    // Internal helpers are just part of the actions in Zustand usually, 
    // but we can expose them if needed or keep them private to the implementation.
    // The interface requested specific methods, so I will name them internally 
    // or expose them if they are useful for debugging/testing.
    // For the store API used by UI, placeStone/passTurn/resetGame are key.
}

const INITIAL_BOARD: (Stone | null)[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

const useGameStore = create<GameStore>((set, get) => ({
    grid: JSON.parse(JSON.stringify(INITIAL_BOARD)), // Deep copy
    turn: 'black',
    turnCount: 0,
    prisoners: { black: 0, white: 0 },
    gameStatus: 'playing',
    lastMove: null,

    resetGame: () => {
        set({
            grid: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
            turn: 'black',
            turnCount: 0,
            prisoners: { black: 0, white: 0 },
            gameStatus: 'playing',
            lastMove: null,
        });
    },

    passTurn: () => {
        set((state) => ({
            turn: state.turn === 'black' ? 'white' : 'black',
            turnCount: state.turnCount + 1,
            lastMove: null, // Clear highlight on pass? Or keep last move? Standard is keep or clear. I'll clear.
        }));
    },

    placeStone: (row: number, col: number) => {
        const { grid, turn, prisoners, gameStatus } = get();

        if (gameStatus !== 'playing') return;
        if (!isValidPoint(row, col)) return;
        if (grid[row][col] !== null) return; // Occupied

        // 1. applyDecay (Current Player's stones lose health)
        // We create a deep copy of the grid to mutate
        let newGrid = grid.map((r) => r.map((s) => (s ? { ...s } : null)));

        // Apply Decay: All existing non-petrified stones of the CURRENT PLAYER lose 1 Health.
        // "Crumbling: If a stone hits 0 Health, it is immediately removed... before the player places their new stone"
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const stone = newGrid[r][c];
                if (stone && stone.color === turn && !stone.isPetrified) {
                    stone.health -= 1;
                    if (stone.health <= 0) {
                        newGrid[r][c] = null; // Crumble
                        // Note: Does this count as a prisoner? Rules say "removed from the board". 
                        // Usually decay is natural death, not capture. I won't increment prisoners.
                    }
                }
            }
        }

        // Verify the spot is still empty (it might have been occupied by a crumbling stone, which is now free, 
        // BUT the user clicked an empty spot originally. If the user clicked a spot that was empty, it stays empty.
        // If the user clicked a spot that HAD a stone that crumbled... wait, the user can't click a stone.
        // So this is fine.)

        // 2. updateGrid (Place the stone)
        const newStone: Stone = {
            color: turn,
            health: 15,
            isPetrified: false,
            id: uuidv4(),
        };
        newGrid[row][col] = newStone;

        // 3. checkCaptures
        // Check opponent groups for 0 liberties
        const opponent = turn === 'black' ? 'white' : 'black';
        let newPrisoners = { ...prisoners };
        const stonesToRemove: Point[] = [];

        // Find all opponent groups and check liberties
        const visitedForCapture = new Set<string>();

        // We scan neighbors of the placed stone first? No, we should scan the whole board or just neighbors.
        // Optimally: check neighbors of the placed stone. If they are opponent, check their group's liberties.
        // Also need to check if the placed stone itself is suicidal (0 liberties and no capture).

        // Let's scan all opponent groups adjacent to the new stone.
        const neighbors = [
            { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
        ];

        neighbors.forEach(({ r, c }) => {
            const nr = row + r;
            const nc = col + c;
            if (isValidPoint(nr, nc)) {
                const stone = newGrid[nr][nc];
                if (stone && stone.color === opponent && !visitedForCapture.has(`${nr},${nc}`)) {
                    const group = getGroup(newGrid, nr, nc);
                    group.forEach(p => visitedForCapture.add(`${p.row},${p.col}`));
                    const liberties = countLiberties(newGrid, group);
                    if (liberties === 0) {
                        stonesToRemove.push(...group);
                    }
                }
            }
        });

        // Remove captured stones
        if (stonesToRemove.length > 0) {
            stonesToRemove.forEach(p => {
                newGrid[p.row][p.col] = null;
            });
            newPrisoners[turn] += stonesToRemove.length;
        } else {
            // Suicide Check: If no captures, does the new stone have 0 liberties?
            // "prohibit immediate recapture of the same board state" (Ko) - optional for MVP.
            // "Danger Avoidance... Do not place a stone where it would immediately have 0 liberties (suicide) unless it captures."
            // Standard Go: Suicide is forbidden.
            const selfGroup = getGroup(newGrid, row, col);
            const selfLiberties = countLiberties(newGrid, selfGroup);
            if (selfLiberties === 0) {
                // Illegal move (Suicide). Revert everything.
                // For MVP, we can just return or ignore.
                // User prompt didn't strictly explicitly forbid interaction in UI, but AI avoids it.
                // Standard Go rules say suicide is forbidden.
                // I will return early if suicide.
                return;
            }
        }

        // 4. checkPetrification
        // "If a group of stones fully encloses one or more empty points... that group becomes Petrified."
        // We run the global checkPetrification from utils logic.
        const petrifiedStones = checkPetrification(newGrid);
        // Apply petrification
        petrifiedStones.forEach(p => {
            const s = newGrid[p.row][p.col];
            if (s) s.isPetrified = true;
        });

        // 5. toggleTurn
        set({
            grid: newGrid,
            turn: opponent,
            turnCount: get().turnCount + 1,
            prisoners: newPrisoners,
            lastMove: { row, col },
        });
    },
}));

export default useGameStore;
