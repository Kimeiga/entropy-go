import React from 'react';
import useGameStore from '../store/gameStore';
import { Stone } from './Stone';
import { BOARD_SIZE } from '../types';

export const Board: React.FC = () => {
    const { grid, placeStone, lastMove } = useGameStore();

    // Board dimensions
    // We'll use a container with padding, and an inner "grid area"
    // The stones will be positioned relative to the grid area.

    return (
        <div className="relative p-1 bg-[#2e3440] rounded-sm shadow-2xl border-2 border-slate-700 select-none">
            {/* Board Surface with Padding for edges */}
            <div className="relative p-8 bg-[#2e3440] rounded-sm">

                {/* The Grid Area (Lines & Intersections) */}
                <div
                    className="relative"
                    style={{
                        width: 'min(75vw, 500px)',
                        height: 'min(75vw, 500px)',
                    }}
                >
                    {/* Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                            <React.Fragment key={i}>
                                {/* Horizontal Line */}
                                <div
                                    className="absolute bg-slate-500 h-[1px] w-full"
                                    style={{
                                        top: `${(i / (BOARD_SIZE - 1)) * 100}%`,
                                        left: 0
                                    }}
                                />
                                {/* Vertical Line */}
                                <div
                                    className="absolute bg-slate-500 w-[1px] h-full"
                                    style={{
                                        left: `${(i / (BOARD_SIZE - 1)) * 100}%`,
                                        top: 0
                                    }}
                                />
                            </React.Fragment>
                        ))}

                        {/* Star Points (Hoshi) */}
                        {[2, 6, 4].map(r =>
                            [2, 6, 4].map(c => (
                                <div
                                    key={`star-${r}-${c}`}
                                    className="absolute w-2 h-2 bg-slate-900 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                        top: `${(r / (BOARD_SIZE - 1)) * 100}%`,
                                        left: `${(c / (BOARD_SIZE - 1)) * 100}%`
                                    }}
                                />
                            ))
                        )}
                    </div>

                    {/* Intersections (Stones & Clicks) */}
                    {grid.map((row, r) => (
                        row.map((stone, c) => {
                            const isLastMove = lastMove?.row === r && lastMove?.col === c;

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className="absolute w-12 h-12 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer hover:bg-white/10 rounded-full transition-colors z-10"
                                    style={{
                                        top: `${(r / (BOARD_SIZE - 1)) * 100}%`,
                                        left: `${(c / (BOARD_SIZE - 1)) * 100}%`,
                                    }}
                                    onClick={() => placeStone(r, c)}
                                >
                                    {/* Last Move Marker (Under Stone) */}
                                    {isLastMove && !stone && (
                                        <div className="absolute w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                    )}

                                    {stone && (
                                        <div className="w-12 h-12 pointer-events-none flex items-center justify-center">
                                            <Stone stone={stone} />
                                        </div>
                                    )}

                                    {/* Last Move Marker (Over Stone) */}
                                    {stone && isLastMove && (
                                        <div className="absolute w-3 h-3 bg-red-500/50 rounded-full border border-white z-20 pointer-events-none" />
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>
        </div>
    );
};
