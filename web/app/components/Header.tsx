'use client';

import { FC, useState } from 'react';
import Image from 'next/image';

const TWITTER_URL = 'https://x.com/BTC500fun';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_MINT || '';

export const Header: FC = () => {
    const [copied, setCopied] = useState(false);

    const copyContract = () => {
        if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== 'YOUR_TOKEN_MINT') {
            navigator.clipboard.writeText(CONTRACT_ADDRESS);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <header className="border-b border-[#d4a23a]/10 backdrop-blur-sm bg-[#1a0f08]/80 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <a href="/" className="flex items-center gap-3">
                        <Image src="/logo.png" alt="BTC500" width={40} height={40} className="rounded-lg" />
                        <span className="text-xl font-bold text-gold-gradient">BTC500</span>
                    </a>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <a
                            href="#stats"
                            className="text-[#c4a882] hover:text-[#f5c542] transition-colors text-sm"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            Stats
                        </a>
                        <a
                            href="#activity"
                            className="text-[#c4a882] hover:text-[#f5c542] transition-colors text-sm"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            Activity
                        </a>
                        <a
                            href="#how-it-works"
                            className="text-[#c4a882] hover:text-[#f5c542] transition-colors text-sm"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            How It Works
                        </a>
                        <a
                            href="/whitepaper"
                            className="text-[#c4a882] hover:text-[#f5c542] transition-colors text-sm"
                        >
                            Whitepaper
                        </a>
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {/* Contract Address */}
                        {CONTRACT_ADDRESS && CONTRACT_ADDRESS !== 'YOUR_TOKEN_MINT' && (
                            <button
                                onClick={copyContract}
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#d4a23a]/10 border border-[#d4a23a]/20 hover:border-[#d4a23a]/40 transition-colors"
                            >
                                <span className="text-xs font-mono text-[#c4a882]">
                                    {CONTRACT_ADDRESS.slice(0, 4)}...{CONTRACT_ADDRESS.slice(-4)}
                                </span>
                                <span className="text-xs text-[#d4a23a]">{copied ? '✓' : '📋'}</span>
                            </button>
                        )}

                        {/* Twitter */}
                        <a
                            href={TWITTER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#d4a23a]/10 border border-[#d4a23a]/20 hover:border-[#d4a23a]/40 transition-colors"
                            title="Follow on X"
                        >
                            <svg className="w-5 h-5 text-[#c4a882]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
};
