import Image from 'next/image';
import { StatsCards } from './components/StatsCards';
import { TransparencySection } from './components/TransparencySection';
import { TransactionFeed } from './components/TransactionFeed';
import { WalletLookup } from './components/WalletLookup';
import { Header } from './components/Header';
import { CountdownTimer } from './components/CountdownTimer';
import { BotStatus } from './components/BotStatus';
import { ContractAddress } from './components/ContractAddress';

export default function Home() {
    return (
        <main className="min-h-screen relative">
            {/* Globe wireframe background */}
            <div className="fixed inset-0 pointer-events-none globe-bg opacity-50" />

            {/* Gold glow effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#d4a23a]/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#d4a23a]/3 rounded-full blur-[100px]" />
            </div>

            {/* Sparkles */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[15%] w-2 h-2 bg-[#f5c542] rounded-full sparkle" style={{ animationDelay: '0s' }} />
                <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 bg-[#f5c542] rounded-full sparkle" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-[40%] left-[25%] w-1 h-1 bg-[#f5c542] rounded-full sparkle" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-[25%] right-[15%] w-2 h-2 bg-[#f5c542] rounded-full sparkle" style={{ animationDelay: '1.5s' }} />
            </div>

            <div className="relative z-10">
                <Header />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Hero with Logo */}
                    <section className="text-center mb-12">
                        <div className="mb-8 flex justify-center">
                            <div className="relative gold-glow">
                                <Image
                                    src="/logo.png"
                                    alt="BTC500"
                                    width={280}
                                    height={280}
                                    className="rounded-2xl"
                                    priority
                                />
                            </div>
                        </div>

                        <p className="text-[#c4a882] text-lg max-w-xl mx-auto leading-relaxed mb-6">
                            Automated Bitcoin rewards. Trade fees convert to wBTC and distribute to all holders every 15 minutes.
                        </p>

                        <BotStatus />
                    </section>

                    {/* Contract Address */}
                    <section className="mb-12 max-w-xl mx-auto">
                        <ContractAddress />
                    </section>

                    {/* Countdown */}
                    <section className="mb-16">
                        <CountdownTimer />
                    </section>

                    {/* Stats */}
                    <section id="stats" className="mb-16 scroll-mt-24">
                        <StatsCards />
                    </section>

                    {/* Main Grid */}
                    <div id="activity" className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-16 scroll-mt-24">
                        <div className="lg:col-span-3">
                            <h2 className="text-lg font-semibold text-gold-gradient mb-4">Activity</h2>
                            <TransactionFeed />
                        </div>
                        <div className="lg:col-span-2">
                            <h2 className="text-lg font-semibold text-gold-gradient mb-4">Your Rewards</h2>
                            <WalletLookup />
                        </div>
                    </div>

                    {/* How It Works */}
                    <section id="how-it-works" className="scroll-mt-24">
                        <h2 className="text-lg font-semibold text-gold-gradient mb-4">How It Works</h2>
                        <TransparencySection />
                    </section>
                </div>

                {/* Footer */}
                <footer className="border-t border-[#d4a23a]/10 py-8 mt-16">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <div className="flex justify-center gap-6 mb-4">
                            <a href="https://x.com/BTC500fun" target="_blank" rel="noopener noreferrer" className="text-[#c4a882] hover:text-[#d4a23a] transition-colors">
                                Twitter/X
                            </a>
                            <a href="/whitepaper" className="text-[#c4a882] hover:text-[#d4a23a] transition-colors">
                                Whitepaper
                            </a>
                        </div>
                        <p className="text-[#8b7355] text-sm">
                            100% on-chain • 100% automated • Fully verifiable
                        </p>
                    </div>
                </footer>
            </div>
        </main>
    );
}
