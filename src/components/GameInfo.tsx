import React, { useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';
import { clsx } from 'clsx';
import { RefreshCw, SkipForward } from 'lucide-react';

export const GameInfo: React.FC = () => {
    const { turn, prisoners, gameStatus, passTurn, resetGame, turnCount } = useGameStore();
    const [animateTurn, setAnimateTurn] = useState(false);

    useEffect(() => {
        setAnimateTurn(true);
        const timer = setTimeout(() => setAnimateTurn(false), 500);
        return () => clearTimeout(timer);
    }, [turn]);

    return (
        <div className="flex flex-col gap-6 w-full max-w-md bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            {/* Header Info */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-100">Game Status</h2>
                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <span>Turn {turnCount}</span>
                    <span>•</span>
                    <span className={clsx(
                        "font-semibold transition-colors duration-300",
                        gameStatus === 'playing' ? "text-green-400" : "text-blue-400"
                    )}>
                        {gameStatus === 'playing' ? 'Active' : 'Game Over'}
                    </span>
                </div>
            </div>

            {/* Turn Indicator */}
            <div className={clsx(
                "relative p-4 rounded-lg bg-slate-900 border text-center transition-all duration-500",
                animateTurn ? "scale-105" : "scale-100",
                turn === 'black' ? "border-slate-600 shadow-slate-900/50" : "border-white/50 shadow-white/10"
            )}>
                <p className={clsx(
                    "text-lg font-bold uppercase tracking-wider",
                    turn === 'black' ? "text-slate-300" : "text-white"
                )}>
                    {turn === 'black' ? "Black's Turn" : "White's Turn"}
                </p>
            </div>

            {/* Prisoners */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase mb-1">Black Captured</p>
                    <p className="text-2xl font-mono text-white">{prisoners.black}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-slate-600 text-center">
                    <p className="text-xs text-slate-400 uppercase mb-1">White Captured</p>
                    <p className="text-2xl font-mono text-white">{prisoners.white}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 mt-auto">
                <button
                    onClick={passTurn}
                    disabled={gameStatus !== 'playing'}
                    className={clsx(
                        "flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors",
                        "bg-slate-700 hover:bg-slate-600 text-slate-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    <SkipForward size={18} />
                    Pass Turn
                </button>

                <button
                    onClick={resetGame}
                    className="flex items-center justify-center gap-2 p-3 rounded-lg font-medium bg-red-900/50 text-red-200 hover:bg-red-900/70 transition-colors border border-red-900"
                >
                    <RefreshCw size={18} />
                    New Game
                </button>
            </div>
        </div>
    );
};
