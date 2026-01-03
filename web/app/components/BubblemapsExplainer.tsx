'use client';

import { FC } from 'react';

export const BubblemapsExplainer: FC = () => {
    return (
        <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-gold-gradient mb-2">Understanding Bubblemaps Connections</h3>
            <p className="text-[#8b7355] text-sm mb-8">Why you'll see connections between dev wallet and holders</p>

            {/* Visual Diagram */}
            <div className="relative py-8">
                <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap md:flex-nowrap">

                    {/* Dev Wallet */}
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-24 rounded-xl border-2 border-[#d4a23a] bg-[#1a0f08] flex flex-col items-center justify-center">
                            <span className="text-[#d4a23a] font-mono text-sm font-bold">DEV WALLET</span>
                            <span className="text-[#8b7355] text-xs mt-1">(BTC500 Bot)</span>
                        </div>
                    </div>

                    {/* Arrows */}
                    <div className="flex flex-col gap-2 text-[#d4a23a]">
                        <div className="flex items-center gap-2">
                            <span>→</span>
                            <span className="text-sm">wBTC</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>→</span>
                            <span className="text-sm">wBTC</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>→</span>
                            <span className="text-sm">wBTC</span>
                        </div>
                        <span className="text-[#8b7355] text-xs">× all holders</span>
                    </div>

                    {/* Holders */}
                    <div className="flex flex-col gap-2">
                        <div className="px-4 py-2 rounded-lg border border-[#c4a882]/30 bg-[#1a0f08]/50 text-[#c4a882] text-sm">
                            Holder #1
                        </div>
                        <div className="px-4 py-2 rounded-lg border border-[#c4a882]/30 bg-[#1a0f08]/50 text-[#c4a882] text-sm">
                            Holder #2
                        </div>
                        <div className="px-4 py-2 rounded-lg border border-[#c4a882]/30 bg-[#1a0f08]/50 text-[#c4a882] text-sm">
                            Holder #3
                        </div>
                        <div className="text-[#8b7355] text-center">...</div>
                        <div className="px-4 py-2 rounded-lg border border-[#c4a882]/30 bg-[#1a0f08]/50 text-[#c4a882] text-sm">
                            Holder #N
                        </div>
                    </div>
                </div>
            </div>

            {/* Explanation */}
            <div className="mt-8 space-y-4 text-[#c4a882] text-sm leading-relaxed">
                <div className="flex gap-3 items-start">
                    <span className="text-[#d4a23a] text-lg">⚠️</span>
                    <div>
                        <strong className="text-[#e8d5c4]">Why Bubblemaps shows connections:</strong>
                        <p className="mt-1">
                            On Bubblemaps, you'll see connections from our dev wallet to many holder wallets.
                            This is <strong className="text-[#d4a23a]">NOT</strong> insider activity or bundling.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="text-[#d4a23a] text-lg">✓</span>
                    <div>
                        <strong className="text-[#e8d5c4]">What it actually is:</strong>
                        <p className="mt-1">
                            Every 15 minutes, our bot sends wBTC rewards from the dev wallet to ALL token holders.
                            This creates legitimate on-chain connections that Bubblemaps detects.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="text-[#d4a23a] text-lg">🔍</span>
                    <div>
                        <strong className="text-[#e8d5c4]">How to verify:</strong>
                        <p className="mt-1">
                            Check the transaction history - you'll see outgoing wBTC transfers, not $BTC500 tokens.
                            The dev wallet is <em>paying out rewards</em>, not distributing supply.
                        </p>
                    </div>
                </div>
            </div>

            {/* TLDR Box */}
            <div className="mt-8 p-4 rounded-xl bg-[#d4a23a]/10 border border-[#d4a23a]/30">
                <p className="text-[#e8d5c4] text-sm">
                    <strong>TL;DR:</strong> Bubblemaps connections = Bitcoin rewards being distributed to holders.
                    It's a feature, not a red flag. 🟠
                </p>
            </div>
        </div>
    );
};
