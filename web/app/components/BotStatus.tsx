'use client';

import { FC, useEffect, useState } from 'react';

interface BotInfo {
    isLive: boolean;
    lastActivity: string | null;
    nextRun: string;
    currentAction: string | null;
}

export const BotStatus: FC = () => {
    const [status, setStatus] = useState<BotInfo>({
        isLive: false,
        lastActivity: null,
        nextRun: '',
        currentAction: null,
    });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/bot-status');
                const data = await res.json();
                setStatus(data);
            } catch {
                // API might not be available yet
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-card">
            <div className={status.isLive ? 'status-live' : 'status-offline'} />
            <span className="text-sm font-medium text-[#c4a882]">
                {status.isLive ? (
                    status.currentAction || 'Bot Running'
                ) : (
                    'Waiting for bot...'
                )}
            </span>
            {status.isLive && status.lastActivity && (
                <span className="text-xs text-[#8b7355]">
                    Last: {formatTimeAgo(status.lastActivity)}
                </span>
            )}
        </div>
    );
};

function formatTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}
