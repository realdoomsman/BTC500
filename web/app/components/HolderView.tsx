'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const HolderView: FC = () => {
    const { connected, publicKey } = useWallet();
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [totalRewards, setTotalRewards] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (connected && publicKey) {
            setLoading(true);
            // In production, this would query the blockchain for actual balances
            // For now, show zeros until connected to real data
            setTimeout(() => {
                setTokenBalance(0);
                setTotalRewards(0);
                setLoading(false);
            }, 500);
        }
    }, [connected, publicKey]);

    if (!connected) {
        return (
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-8 backdrop-blur-xl text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-bitcoin-orange/20 to-amber-500/10 flex items-center justify-center">
                    <span className="text-4xl">₿</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                    Connect Wallet
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                    View your token balance and BTC rewards
                </p>
                <WalletMultiButton />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-6 backdrop-blur-xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-24 bg-white/5 rounded-xl" />
                    <div className="h-16 bg-white/5 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-xl overflow-hidden">
            {/* Balance Summary */}
            <div className="p-6 border-b border-white/5">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <div className="text-sm text-gray-400 mb-1">Token Balance</div>
                        <div className="text-2xl font-bold text-white">
                            {tokenBalance?.toLocaleString() || '0'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-400 mb-1">BTC Earned</div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-bitcoin-orange to-amber-500 bg-clip-text text-transparent">
                            {totalRewards.toFixed(8)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400 text-sm font-medium">
                        Wallet Connected
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="p-6">
                <p className="text-gray-400 text-sm text-center">
                    Your BTC rewards will appear here after distributions begin.
                </p>
            </div>
        </div>
    );
};
