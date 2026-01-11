import { useEffect } from 'react';
import { Board } from './components/Board';
import { GameInfo } from './components/GameInfo';
import useGameStore from './store/gameStore';
import { getBestMove } from './utils/ai';

function App() {
  const { turn, gameStatus, grid, prisoners, turnCount, placeStone, passTurn, lastMove } = useGameStore();

  // AI Integration Hook
  useEffect(() => {
    if (turn === 'white' && gameStatus === 'playing') {
      const timer = setTimeout(() => {
        // Re-construct minimal state for AI to avoid passing huge objects if not needed,
        // but our getBestMove needs grid mainly.
        const boardState = {
          grid,
          turn,
          turnCount,
          prisoners,
          gameStatus,
          lastMove
        };

        const move = getBestMove(boardState, 'white');

        if (move) {
          placeStone(move.row, move.col);
        } else {
          // If AI has no valid moves (rare usually, but possible if board full), pass.
          // Or if it thinks it should pass (heuristic returns null).
          passTurn();
        }
      }, 700); // 700ms delay for natural feel

      return () => clearTimeout(timer);
    }
  }, [turn, gameStatus, grid, prisoners, turnCount, lastMove, placeStone, passTurn]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100 selection:bg-yellow-500/30">
      <main className="flex flex-col lg:flex-row items-center gap-10 max-w-7xl w-full">

        {/* Header / Brand (Mobile only, or above board) */}
        <div className="lg:hidden text-center mb-4">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-100 to-yellow-500 bg-clip-text text-transparent">
            Entropy Go
          </h1>
          <p className="text-slate-400 text-sm mt-1">Decay. Petrify. Survive.</p>
        </div>

        {/* Board Section */}
        <div className="flex-1 flex flex-col items-center">
          <div className="hidden lg:block mb-8 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-100 to-yellow-500 bg-clip-text text-transparent">
              Entropy Go
            </h1>
            <p className="text-slate-400 mt-2">Decay. Petrify. Survive.</p>
          </div>

          <Board />
        </div>

        {/* Sidebar Section */}
        <div className="w-full lg:w-96 flex flex-col justify-start h-[600px]">
          <GameInfo />

          {/* Rules Summary / Legend */}
          <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-500 space-y-2">
            <p><strong className="text-slate-400">Decay:</strong> Stones lose 1 HP every turn. At 0 HP, they crumble.</p>
            <p><strong className="text-slate-400">Petrification:</strong> Encloded territories become eternal (Infinite HP).</p>
            <p><strong className="text-slate-400">Capture:</strong> Surround enemy groups to remove them.</p>
          </div>
        </div>

      </main>

      {/* Toast Notification Area (Placeholder for now) */}
      {/* Could use a library like sonner or just custom store state for messages */}
    </div>
  );
}

export default App;
