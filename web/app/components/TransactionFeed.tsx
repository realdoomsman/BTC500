'use client';

import { FC, useEffect, useState } from 'react';

interface Transaction {
    type: 'swap' | 'distribution';
    timestamp: string;
    txHash: string;
    solAmount?: number;
    btcAmount?: number;
    holderCount?: number;
}

export const TransactionFeed: FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();

                const txs: Transaction[] = [];

                if (data.recentSwaps) {
                    data.recentSwaps.forEach((swap: any) => {
                        txs.push({
                            type: 'swap',
                            timestamp: swap.timestamp,
                            txHash: swap.txHash,
                            solAmount: swap.solAmount,
                            btcAmount: swap.btcAmount,
                        });
                    });
                }

                if (data.recentDistributions) {
                    data.recentDistributions.forEach((dist: any) => {
                        txs.push({
                            type: 'distribution',
                            timestamp: dist.timestamp,
                            txHash: dist.txHash,
                            btcAmount: dist.btcAmount,
                            holderCount: dist.holderCount,
                        });
                    });
                }

                txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setTransactions(txs);
            } catch {
                // Keep empty
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
        const interval = setInterval(fetchTransactions, 10000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const truncateTx = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-6)}`;

    if (loading) {
        return (
            <div className="glass-card p-6">
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#d4a23a]/10 rounded-xl" />
                            <div className="flex-1">
                                <div className="h-4 bg-[#d4a23a]/10 rounded w-1/3 mb-2" />
                                <div className="h-3 bg-[#d4a23a]/10 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#d4a23a]/10 flex items-center justify-center">
                    <span className="text-3xl opacity-50">📊</span>
                </div>
                <h3 className="text-lg font-medium text-[#c4a882] mb-2">No Transactions Yet</h3>
                <p className="text-[#8b7355] text-sm">
                    Transactions will appear here once the bot starts processing.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            <div className="divide-y divide-[#d4a23a]/10">
                {transactions.map((tx, i) => (
                    <a
                        key={i}
                        href={`https://solscan.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-5 transition-all duration-200 hover:bg-[#d4a23a]/5"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tx.type === 'swap' ? 'bg-[#d4a23a]/10' : 'bg-[#f5c542]/10'
                            }`}>
                            <span className="text-xl">{tx.type === 'swap' ? '⚡' : '💰'}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#e8d5c4]">
                                    {tx.type === 'swap' ? 'Swap' : 'Distribution'}
                                </span>
                                <span className="text-[#8b7355] text-sm">{formatTime(tx.timestamp)}</span>
                            </div>
                            <div className="text-[#c4a882] text-sm">
                                {tx.type === 'swap' ? (
                                    <>{tx.solAmount} SOL → {tx.btcAmount?.toFixed(8)} BTC</>
                                ) : (
                                    <>{tx.btcAmount?.toFixed(8)} BTC → {tx.holderCount} holders</>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                            <span className="font-mono text-sm text-[#8b7355]">{truncateTx(tx.txHash)}</span>
                            <span className="text-[#d4a23a]">↗</span>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};
