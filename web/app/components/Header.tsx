'use client';

import { FC } from 'react';
import Image from 'next/image';

export const Header: FC = () => {
    return (
        <header className="border-b border-[#d4a23a]/10 backdrop-blur-sm bg-[#1a0f08]/80 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <a href="/" className="flex items-center gap-3">
                        <Image src="/logo.png" alt="BTC500" width={40} height={40} className="rounded-lg" />
                        <span className="text-xl font-bold text-gold-gradient">
                            BTC500
                        </span>
                    </a>

                    {/* Navigation */}
                    <nav className="flex items-center gap-6">
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
                    </nav>
                </div>
            </div>
        </header>
    );
};
