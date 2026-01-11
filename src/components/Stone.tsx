import React from 'react';
import type { Stone as StoneType } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StoneProps {
    stone: StoneType;
}

export const Stone: React.FC<StoneProps> = ({ stone }) => {
    const { color, health, isPetrified } = stone;
    const isCritical = health < 5 && !isPetrified;
    const maxHealth = 15;

    // Calculate stroke dashoffset for the health ring
    // Stone is 80% of 48px = ~38px diameter => ~19px radius
    // We want the ring OUTSIDE the stone. 
    // Radius 21px with width 4px => spans 19px-23px.
    const radius = 21;
    const circumference = 2 * Math.PI * radius;
    const progress = isPetrified ? 1 : health / maxHealth;
    const dashoffset = circumference - progress * circumference;

    return (
        <div className="relative w-full h-full flex items-center justify-center group cursor-default">
            {/* Stone Body */}
            <div
                className={twMerge(
                    "w-[75%] h-[75%] rounded-full shadow-lg relative z-10 transition-all duration-300",
                    color === 'black'
                        ? "bg-black bg-[radial-gradient(circle_at_30%_30%,_#4b5563,_#000000)]"
                        : "bg-gray-100 bg-[radial-gradient(circle_at_30%_30%,_#ffffff,_#d1d5db)]",
                    isPetrified && "border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]",
                    isCritical && "animate-pulse-slow shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                )}
            >
                {/* Hover Health Text */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className={clsx(
                        "text-xs font-bold select-none",
                        color === 'black' ? "text-white" : "text-black",
                        isPetrified && "text-yellow-600"
                    )}>
                        {isPetrified ? '∞' : health}
                    </span>
                </div>
            </div>

            {/* Health Ring SVG */}
            <svg className="absolute w-full h-full rotate-[-90deg] z-0 pointer-events-none overflow-visible">
                {/* Background Ring */}
                <circle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    fill="transparent"
                    stroke={color === 'black' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'}
                    strokeWidth="4"
                />
                {/* Progress Ring */}
                <circle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    fill="transparent"
                    stroke={isPetrified ? '#facc15' : isCritical ? '#ef4444' : '#10b981'}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
        </div>
    );
};
