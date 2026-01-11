import { BOARD_SIZE } from '../types';
import type { Player, Point, Stone } from '../types';

// Directions for orthogonal movement (Up, Down, Left, Right)
const DIRECTIONS = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
];

/**
 * Checks if a point is within the board boundaries
 */
export function isValidPoint(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Gets the unique key for a point to use in Sets/Maps
 */
function pointKey(row: number, col: number): string {
    return `${row},${col}`;
}

/**
 * Flood fill to find a group of connected stones of the same color
 */
export function getGroup(
    grid: (Stone | null)[][],
    row: number,
    col: number
): Point[] {
    const stone = grid[row][col];
    if (!stone) return [];

    const color = stone.color;
    const group: Point[] = [];
    const visited = new Set<string>();
    const stack: Point[] = [{ row, col }];

    visited.add(pointKey(row, col));

    while (stack.length > 0) {
        const current = stack.pop()!;
        group.push(current);

        for (const dir of DIRECTIONS) {
            const newRow = current.row + dir.row;
            const newCol = current.col + dir.col;

            if (isValidPoint(newRow, newCol)) {
                const key = pointKey(newRow, newCol);
                if (!visited.has(key)) {
                    const neighbor = grid[newRow][newCol];
                    if (neighbor && neighbor.color === color) {
                        visited.add(key);
                        stack.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
    }

    return group;
}

/**
 * Counts the liberties of a group of stones
 * A liberty is an empty orthogonal intersection adjacent to the group
 */
export function countLiberties(
    grid: (Stone | null)[][],
    group: Point[]
): number {
    const liberties = new Set<string>();

    for (const point of group) {
        for (const dir of DIRECTIONS) {
            const newRow = point.row + dir.row;
            const newCol = point.col + dir.col;

            if (isValidPoint(newRow, newCol)) {
                if (grid[newRow][newCol] === null) {
                    liberties.add(pointKey(newRow, newCol));
                }
            }
        }
    }

    return liberties.size;
}

/**
 * Checks for petrification (lines up with "Twist 2")
 * If a group encloses one or more empty points (territory), it becomes petrified.
 * 
 * Logic:
 * 1. Find all empty regions (connected components of empty points).
 * 2. For each region, check its boundaries.
 * 3. If all boundaries belong to the SAME player, that player's boundary stones are petrified.
 */
export function checkPetrification(grid: (Stone | null)[][]): Point[] {
    const petrifiedStones: Point[] = [];
    const visitedAppEmpty = new Set<string>();

    // Iterate over every point on the board
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] === null && !visitedAppEmpty.has(pointKey(r, c))) {
                // Found a new empty region, explore it
                const { region, boundaryColors, boundaryStones } = exploreEmptyRegion(grid, r, c);

                // Mark region as visited
                for (const p of region) {
                    visitedAppEmpty.add(pointKey(p.row, p.col));
                }

                // DEBUG LOGGING
                console.log(`Region at ${r},${c}: Size=${region.length}, Colors=[${Array.from(boundaryColors)}]`);

                // IGNORE "Outside" / Large regions
                // If a region is huge (e.g. > 40% of board), it's likely the common space, not "enclosed territory".
                // 9x9 = 81 points. 30 seems a safe cutoff for "territory" vs "open board".
                if (region.length > 30) continue;

                // If the region is fully enclosed by ONE color, those stones become petrified
                if (boundaryColors.size === 1) {
                    console.log('-> PETRIFICATION TRIGGERED for stones:', boundaryStones);
                    // Add all boundary stones to the result
                    petrifiedStones.push(...boundaryStones);
                }
            }
        }
    }

    // Note: This function identifies WHICH stones should be petrified.
    // The state update happens in the store.
    return petrifiedStones;
}

/**
 * Helper to explore an empty region and identify its boundary
 */
function exploreEmptyRegion(
    grid: (Stone | null)[][],
    startRow: number,
    startCol: number
) {
    const region: Point[] = [];
    const boundaryColors = new Set<Player>();
    const visited = new Set<string>();
    const stack: Point[] = [{ row: startRow, col: startCol }];

    visited.add(pointKey(startRow, startCol));

    while (stack.length > 0) {
        const current = stack.pop()!;
        region.push(current);

        for (const dir of DIRECTIONS) {
            const newRow = current.row + dir.row;
            const newCol = current.col + dir.col;

            if (!isValidPoint(newRow, newCol)) {
                // Hit the edge of the board.
                // In this rule set: "For this MVP, treat the board edge as a 'wall'. 
                // If a group encloses space against the edge, it counts."
                // So we effectively ignore the edge of the board as a "leak".
                continue;
            }

            const key = pointKey(newRow, newCol);
            const neighbor = grid[newRow][newCol];

            if (neighbor === null) {
                // Empty point, continue flood fill
                if (!visited.has(key)) {
                    visited.add(key);
                    stack.push({ row: newRow, col: newCol });
                }
            } else {
                // Stone encountered (boundary)
                boundaryColors.add(neighbor.color);
                // We track the specific stones forming the boundary so we can petrify them
                // We use an array checking to avoid dupes in this local scope would be expensive O(N^2) potentially if naive,
                // but typically small. Let's use a Set for boundary stones to be safe and clean.
            }
        }
    }

    // Post-process boundary stones to return unique points
    // Redoing the scan to be cleaner? No, let's just use a Set for the return.
    const uniqueBoundaryStones = new Map<string, Point>();

    // To populate boundaryStones correctly, we need to scan the region's neighbors again or track them during the walk.
    // The loop above adds colors but didn't push to a list because we didn't want duplicates or had checking issues.
    // Let's iterate the found empty region and check neighbors to find the exact boundary stones.
    for (const emptyPoint of region) {
        for (const dir of DIRECTIONS) {
            const nRow = emptyPoint.row + dir.row;
            const nCol = emptyPoint.col + dir.col;
            if (isValidPoint(nRow, nCol)) {
                const stone = grid[nRow][nCol];
                if (stone) {
                    uniqueBoundaryStones.set(pointKey(nRow, nCol), { row: nRow, col: nCol });
                }
            }
        }
    }

    return {
        region,
        boundaryColors,
        boundaryStones: Array.from(uniqueBoundaryStones.values()),
    };
}
