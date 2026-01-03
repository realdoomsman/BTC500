'use client';

import { FC, useEffect, useState } from 'react';

interface Stats {
    totalSolCollected: number;
    totalBtcDistributed: number;
    lastSwapTimestamp: string | null;
    holderCount: number;
    distributionCount: number;
}

export const StatsCards: FC = () => {
    const [stats, setStats] = useState<Stats>({
        totalSolCollected: 0,
        totalBtcDistributed: 0,
        lastSwapTimestamp: null,
        holderCount: 0,
        distributionCount: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                setStats(data);
            } catch {
                // API error, keep defaults
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num: number, decimals: number = 2) => {
        return num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };

    const formatTimeAgo = (timestamp: string | null) => {
        if (!timestamp) return 'Never';
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const cards = [
        {
            label: 'Total SOL Collected',
            value: `${formatNumber(stats.totalSolCollected)} SOL`,
            icon: '◎',
        },
        {
            label: 'Total BTC Distributed',
            value: `${formatNumber(stats.totalBtcDistributed, 8)} BTC`,
            icon: '₿',
        },
        {
            label: 'Eligible Holders',
            value: formatNumber(stats.holderCount, 0),
            icon: '◆',
        },
        {
            label: 'Last Distribution',
            value: formatTimeAgo(stats.lastSwapTimestamp),
            icon: '◷',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className={`glass-card p-6 transition-all duration-300 ${loading ? 'animate-pulse' : ''}`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-[#8b7355]">{card.label}</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4a23a]/10">
                            <span className="text-xl text-gold-gradient">{card.icon}</span>
                        </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-gold-gradient">
                        {card.value}
                    </div>
                </div>
            ))}
        </div>
    );
};
