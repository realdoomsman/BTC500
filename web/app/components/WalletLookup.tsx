'use client';

import { FC, useState } from 'react';

interface RewardsResult {
    btcEarned: number;
    distributions: number;
    transfers: Array<{ amount: number; txHash: string }>;
}

export const WalletLookup: FC = () => {
    const [walletAddress, setWalletAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<RewardsResult | null>(null);
    const [error, setError] = useState('');

    const handleLookup = async () => {
        if (!walletAddress.trim()) {
            setError('Enter a wallet address');
            return;
        }

        if (walletAddress.length < 32 || walletAddress.length > 44) {
            setError('Invalid wallet address');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`/api/rewards?wallet=${encodeURIComponent(walletAddress)}`);
            const data = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setResult(data);
            }
        } catch {
            setError('Failed to fetch rewards');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleLookup();
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gold-gradient mb-4">Check Your Rewards</h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter your Solana wallet"
                        className="input-gold flex-1 text-sm"
                    />
                    <button onClick={handleLookup} disabled={loading} className="btn-gold text-sm">
                        {loading ? '...' : 'Look Up'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            {result && (
                <div className="border-t border-[#d4a23a]/10 p-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-gold-gradient">
                                {result.btcEarned.toFixed(8)}
                            </div>
                            <div className="text-[#8b7355] text-xs mt-1">BTC Earned</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#e8d5c4]">
                                {result.distributions}
                            </div>
                            <div className="text-[#8b7355] text-xs mt-1">Distributions</div>
                        </div>
                    </div>

                    {result.btcEarned === 0 ? (
                        <p className="text-[#8b7355] text-sm text-center mt-4">
                            No rewards yet. Hold tokens to earn BTC.
                        </p>
                    ) : result.transfers.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#d4a23a]/10">
                            <p className="text-[#8b7355] text-xs mb-2">Recent Rewards</p>
                            <div className="space-y-2">
                                {result.transfers.slice(0, 3).map((t, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-[#e8d5c4]">+{t.amount.toFixed(8)} BTC</span>
                                        <a
                                            href={`https://solscan.io/tx/${t.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#d4a23a] hover:underline"
                                        >
                                            View ↗
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
