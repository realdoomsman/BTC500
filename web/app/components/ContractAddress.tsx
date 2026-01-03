'use client';

import { FC, useState } from 'react';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_MINT || '';

export const ContractAddress: FC = () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== 'YOUR_TOKEN_MINT') {
            navigator.clipboard.writeText(CONTRACT_ADDRESS);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === 'YOUR_TOKEN_MINT') {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-[#8b7355] text-sm">Contract address available at launch</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <p className="text-[#8b7355] text-xs uppercase tracking-wider mb-3 text-center">Contract Address</p>
            <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-3 rounded-xl bg-[#1a0f08]/80 border border-[#d4a23a]/20 font-mono text-[#c4a882] text-sm overflow-hidden text-ellipsis">
                    {CONTRACT_ADDRESS}
                </div>
                <button
                    onClick={handleCopy}
                    className="btn-gold px-4 py-3 text-sm flex items-center gap-2"
                >
                    {copied ? '✓ Copied' : '📋 Copy'}
                </button>
            </div>
            <div className="flex justify-center gap-4 mt-4">
                <a
                    href={`https://solscan.io/token/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d4a23a] text-sm hover:underline"
                >
                    Solscan ↗
                </a>
                <a
                    href={`https://birdeye.so/token/${CONTRACT_ADDRESS}?chain=solana`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d4a23a] text-sm hover:underline"
                >
                    Birdeye ↗
                </a>
                <a
                    href={`https://pump.fun/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d4a23a] text-sm hover:underline"
                >
                    Pump.fun ↗
                </a>
            </div>
        </div>
    );
};
