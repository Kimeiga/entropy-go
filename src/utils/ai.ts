import { BOARD_SIZE } from '../types';
import type { BoardState, Player, Stone, Point } from '../types';
import { getGroup, countLiberties, isValidPoint, checkPetrification } from './goLogic';

// Weights from spec
const SCORES = {
    KILL: 1000,
    SAVE: 500,
    PETRIFY: 300,
    EXPANSION: 10,
    DANGER: -500,
};

/**
 * AI Bot Logic
 * 
 * Heuristics:
 * 1. Kill Move (+1000): Reduces enemy group to 0 liberties.
 * 2. Save Move (+500): Increases friendly group from 1 liberty.
 * 3. Petrify Move (+300): Completes a territory.
 * 4. Expansion (+10): Prefer spots with more empty neighbors.
 * 5. Danger Avoidance (-500): Do not place where liberties -> 0 (suicide-ish).
 */
export function getBestMove(boardState: BoardState, player: Player): Point | null {
    const { grid } = boardState;
    const opponent = player === 'black' ? 'white' : 'black';
    let bestScore = -Infinity;
    let bestMoves: Point[] = [];

    // Iterate all valid moves
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] !== null) continue;

            // Simulate Move
            // We need a deep clone for simulation to avoid mutating state, 
            // but copying the whole board 81 times is somewhat expensive (though fine for 9x9).
            // We'll trust built-in performance for now.
            const score = evaluateMove(grid, r, c, player, opponent);

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [{ row: r, col: c }];
            } else if (score === bestScore) {
                bestMoves.push({ row: r, col: c });
            }
        }
    }

    if (bestMoves.length === 0) return null; // Pass?

    // Randomize among ties to feel less robotic
    const randomIdx = Math.floor(Math.random() * bestMoves.length);
    return bestMoves[randomIdx];
}

function evaluateMove(
    originalGrid: (Stone | null)[][],
    row: number,
    col: number,
    player: Player,
    opponent: Player
): number {
    let score = 0;

    // Clone grid for simulation
    // JSON parse/stringify is slow but robust for deep objects. 
    // For this logic, we just need the structure.
    const grid = originalGrid.map(row => row.map(s => s ? { ...s } : null));

    // Place Stone
    grid[row][col] = { color: player, health: 15, isPetrified: false, id: 'sim' };

    // 1. Check Captures (Kill Move)
    let captures = 0;
    const neighbors = [
        { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
    ];

    const opponentGroupsChecked = new Set<string>();

    for (const { r, c } of neighbors) {
        const nr = row + r;
        const nc = col + c;
        if (isValidPoint(nr, nc)) {
            const stone = grid[nr][nc];
            // Check opponent groups adjacent to placement
            if (stone && stone.color === opponent && !opponentGroupsChecked.has(`${nr},${nc}`)) {
                const group = getGroup(grid, nr, nc);
                // Mark as checked
                group.forEach(p => opponentGroupsChecked.add(`${p.row},${p.col}`));

                const liberties = countLiberties(grid, group);
                if (liberties === 0) {
                    captures += group.length;
                }
            }
        }
    }

    if (captures > 0) {
        score += SCORES.KILL * captures; // Scale by size? Prompt just says "Kill Move +1000", implies flat or per move. Let's do flat bonus for *any* kill, or scaled? "If a move reduces an enemy group to 0 liberties." implied specific group. Let's just add 1000 if ANY kill happens.
        // Actually, +1000 per kill move incident (finding a kill) seems right.
        score += SCORES.KILL;
    }

    // 2. Check Self Liberties (Danger / Save)
    const selfGroup = getGroup(grid, row, col);
    const selfLiberties = countLiberties(grid, selfGroup);

    if (selfLiberties === 0 && captures === 0) {
        // Suicide without capture
        score += SCORES.DANGER;
        // Since it's illegal usually, AI should hate this.
    }

    // "Save Move (+500): If a friendly group has 1 liberty and this move increases it."
    // To check this, we need to know if we connected to a group that USED to have 1 liberty.
    // We can look at neighbors again. If we touch a friendly group that currently (after merge) has > 1 liberty,
    // we check if it had 1 liberty BEFORE.
    // Optimization: Just check if we are adjacent to a friendly stone.
    let savedGroup = false;
    for (const { r, c } of neighbors) {
        const nr = row + r;
        const nc = col + c;
        if (isValidPoint(nr, nc)) {
            const neighbor = originalGrid[nr][nc]; // Look at OLD grid
            if (neighbor && neighbor.color === player) {
                const oldGroup = getGroup(originalGrid, nr, nc);
                const oldLibs = countLiberties(originalGrid, oldGroup);
                if (oldLibs === 1) {
                    // We connected to a group in atari.
                    // Does the new group have > 1 liberty?
                    if (selfLiberties > 1) {
                        savedGroup = true;
                    }
                }
            }
        }
    }
    if (savedGroup) {
        score += SCORES.SAVE;
    }

    // 3. Petrification (+300)
    // Check if this move triggers petrification for US.
    // We can run checkPetrification(grid) and see if any NEW stones are petrified compared to old grid?
    // Or just check if this stone becomes petrified or causes it.
    // The 'checkPetrification' function returns ALL petrified stones.
    // We can optimize by checking if the result list contains our new stone or neighbors?
    // Let's just run it. It's 9x9, fast enough.
    const petrified = checkPetrification(grid);
    // If count of petrified stones increases for us?
    // Or simply if we successfully petrified something.
    // "If a move completes a territory".
    // Let's just add score if WE are petrified or caused petrification of our color.
    const myPetrifiedCount = petrified.filter(p => grid[p.row][p.col]?.color === player).length;
    // We need to compare to baseline? Ideally yes, but let's assume if we are petrifying we are doing good.
    // Actually, if we are ALREADY petrified, we don't get points for re-petrifying same stones.
    // But stones don't un-petrify.
    // So if myPetrifiedCount > oldMyPetrifiedCount.
    // Since 'originalGrid' doesn't track petrification logic dynamically in this function (it relies on store state usually), 
    // we might miss "already petrified" flag in 'Stone' object if we didn't pass it.
    // 'originalGrid' stones have 'isPetrified'.
    const oldPetrifiedCount = originalGrid.flat().filter(s => s?.color === player && s.isPetrified).length;

    if (myPetrifiedCount > oldPetrifiedCount) {
        score += SCORES.PETRIFY;
    }

    // 4. Expansion (+10 per empty neighbor)
    // "Prefer spots with more empty neighbors (max 4)"
    let emptyNeighbors = 0;
    for (const { r, c } of neighbors) {
        const nr = row + r;
        const nc = col + c;
        if (isValidPoint(nr, nc)) {
            if (originalGrid[nr][nc] === null) {
                emptyNeighbors++;
            }
        }
    }
    score += (emptyNeighbors * SCORES.EXPANSION);

    return score;
}
