import Image from 'next/image';
import { StatsCards } from './components/StatsCards';
import { TransparencySection } from './components/TransparencySection';
import { TransactionFeed } from './components/TransactionFeed';
import { WalletLookup } from './components/WalletLookup';
import { Header } from './components/Header';
import { BotStatus } from './components/BotStatus';
import { ContractAddress } from './components/ContractAddress';
import { BubblemapsExplainer } from './components/BubblemapsExplainer';

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



                    {/* Stats */}
                    <section id="stats" className="mb-16 scroll-mt-24">
                        <StatsCards />
                    </section>

                    {/* Your Rewards */}
                    <div className="mb-16 max-w-md mx-auto">
                        <h2 className="text-lg font-semibold text-gold-gradient mb-4">Your Rewards</h2>
                        <WalletLookup />
                    </div>

                    {/* How It Works */}
                    <section id="how-it-works" className="scroll-mt-24 mb-16">
                        <h2 className="text-lg font-semibold text-gold-gradient mb-4">How It Works</h2>
                        <TransparencySection />
                    </section>

                    {/* Bubblemaps Explainer */}
                    <section className="mb-16">
                        <BubblemapsExplainer />
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
