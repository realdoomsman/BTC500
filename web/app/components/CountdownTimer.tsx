'use client';

import { FC, useEffect, useState } from 'react';

export const CountdownTimer: FC = () => {
    const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            const nextInterval = Math.ceil((minutes + 1) / 15) * 15;
            const minutesLeft = (nextInterval - minutes - 1 + 60) % 60 || 15;
            const secondsLeft = 59 - seconds;

            setTimeLeft({ minutes: minutesLeft, seconds: secondsLeft });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    const padZero = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className="relative max-w-sm mx-auto">
            {/* Gold glow */}
            <div className="absolute inset-0 bg-[#d4a23a]/20 rounded-3xl blur-xl" />

            <div className="relative glass-card p-8 text-center pulse-gold">
                <p className="text-[#8b7355] text-sm font-medium mb-4 uppercase tracking-wider">
                    Next Distribution
                </p>
                <div className="flex items-center justify-center gap-3">
                    <div className="w-20 rounded-xl bg-[#1a0f08]/80 border border-[#d4a23a]/20 py-4">
                        <span className="text-4xl font-mono font-bold text-gold-gradient">
                            {padZero(timeLeft.minutes)}
                        </span>
                        <span className="text-[#8b7355] text-xs block mt-1 uppercase tracking-wider">min</span>
                    </div>
                    <span className="text-3xl text-[#d4a23a] font-bold animate-pulse">:</span>
                    <div className="w-20 rounded-xl bg-[#1a0f08]/80 border border-[#d4a23a]/20 py-4">
                        <span className="text-4xl font-mono font-bold text-gold-gradient">
                            {padZero(timeLeft.seconds)}
                        </span>
                        <span className="text-[#8b7355] text-xs block mt-1 uppercase tracking-wider">sec</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
