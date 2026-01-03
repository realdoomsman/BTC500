import Image from 'next/image';
import { Header } from '../components/Header';

export default function Whitepaper() {
    return (
        <main className="min-h-screen relative bg-gradient-to-b from-[#1a0f08] to-[#0d0704]">
            <div className="fixed inset-0 pointer-events-none globe-bg opacity-30" />

            <div className="relative z-10">
                <Header />

                <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    {/* Title */}
                    <div className="text-center mb-16">
                        <Image src="/logo.png" alt="BTC500" width={120} height={120} className="mx-auto mb-6 rounded-xl gold-glow" />
                        <h1 className="text-4xl font-bold text-gold-gradient mb-4">BTC500 Whitepaper</h1>
                        <p className="text-[#8b7355]">Automated Bitcoin Rewards Distribution Protocol</p>
                    </div>

                    <div className="prose prose-invert prose-gold max-w-none space-y-12">

                        {/* Abstract */}
                        <section className="glass-card p-8">
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">Abstract</h2>
                            <p className="text-[#c4a882] leading-relaxed">
                                BTC500 is a fully automated, on-chain protocol that converts Pump.fun trading fees into Bitcoin rewards
                                for token holders. By leveraging Solana's speed and Jupiter's liquidity aggregation, the system swaps
                                accumulated SOL fees to wBTC (Wormhole Bitcoin) and distributes them proportionally to all eligible
                                holders every 15 minutes.
                            </p>
                        </section>

                        {/* Problem */}
                        <section>
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">The Problem</h2>
                            <p className="text-[#c4a882] leading-relaxed mb-4">
                                Most memecoins offer holders no utility beyond speculation. Trading fees typically benefit only
                                the project creators, leaving holders with tokens that have no intrinsic value generation mechanism.
                            </p>
                            <p className="text-[#c4a882] leading-relaxed">
                                Additionally, many "reward" projects require manual claiming, complex staking, or rely on
                                centralized systems that can be manipulated or abandoned.
                            </p>
                        </section>

                        {/* Solution */}
                        <section>
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">The Solution</h2>
                            <p className="text-[#c4a882] leading-relaxed mb-4">
                                BTC500 solves these problems with a simple, transparent mechanism:
                            </p>
                            <ol className="space-y-4 text-[#c4a882]">
                                <li className="flex gap-3">
                                    <span className="text-gold-gradient font-bold">1.</span>
                                    <span>Trading fees from Pump.fun accumulate in the project's dev wallet as SOL</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-gold-gradient font-bold">2.</span>
                                    <span>An automated bot swaps this SOL to wBTC via Jupiter (best price aggregator)</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-gold-gradient font-bold">3.</span>
                                    <span>The wBTC is distributed proportionally to all token holders</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-gold-gradient font-bold">4.</span>
                                    <span>No claiming required - rewards are sent directly to holder wallets</span>
                                </li>
                            </ol>
                        </section>

                        {/* Technical Architecture */}
                        <section className="glass-card p-8">
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">Technical Architecture</h2>

                            <h3 className="text-lg font-semibold text-[#e8d5c4] mt-6 mb-3">Distribution Bot</h3>
                            <ul className="space-y-2 text-[#c4a882]">
                                <li>• Runs on a 15-minute cron schedule</li>
                                <li>• Checks dev wallet balance against configurable threshold</li>
                                <li>• Executes SOL → wBTC swap via Jupiter V6 API</li>
                                <li>• Fetches all token holders via Helius DAS API</li>
                                <li>• Calculates proportional distribution based on holdings</li>
                                <li>• Executes batched SPL token transfers with retry logic</li>
                            </ul>

                            <h3 className="text-lg font-semibold text-[#e8d5c4] mt-6 mb-3">Dashboard</h3>
                            <ul className="space-y-2 text-[#c4a882]">
                                <li>• Real-time stats from cloud database</li>
                                <li>• Transaction feed showing all swaps and distributions</li>
                                <li>• Wallet lookup to check personal reward history</li>
                                <li>• Bot status indicator showing live activity</li>
                            </ul>

                            <h3 className="text-lg font-semibold text-[#e8d5c4] mt-6 mb-3">Data Flow</h3>
                            <div className="bg-[#1a0f08] rounded-xl p-4 font-mono text-sm text-[#c4a882]">
                                Pump.fun Trades → Dev Wallet (SOL) → Jupiter Swap → wBTC → Distribution → Holder Wallets
                            </div>
                        </section>

                        {/* Distribution Formula */}
                        <section>
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">Distribution Formula</h2>
                            <p className="text-[#c4a882] leading-relaxed mb-4">
                                Rewards are distributed proportionally based on token holdings:
                            </p>
                            <div className="bg-[#1a0f08] rounded-xl p-4 font-mono text-center text-[#c4a882] border border-[#d4a23a]/20">
                                holder_reward = (holder_balance / total_supply) × total_wBTC
                            </div>
                            <p className="text-[#8b7355] text-sm mt-4">
                                Note: Minimum balance thresholds may apply to filter dust accounts and reduce transaction costs.
                            </p>
                        </section>

                        {/* Security */}
                        <section className="glass-card p-8">
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">Security Considerations</h2>
                            <ul className="space-y-3 text-[#c4a882]">
                                <li className="flex gap-3">
                                    <span className="text-green-500">✓</span>
                                    <span><strong>No Smart Contract Risk:</strong> Pure SPL token transfers, no custom contracts</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-green-500">✓</span>
                                    <span><strong>On-Chain Verification:</strong> All transactions public on Solana blockchain</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-green-500">✓</span>
                                    <span><strong>Automated Execution:</strong> No manual intervention required</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-green-500">✓</span>
                                    <span><strong>Jupiter Protection:</strong> Dynamic slippage and minimum output enforcement</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-green-500">✓</span>
                                    <span><strong>Safety Floor:</strong> Bot maintains minimum SOL for operations</span>
                                </li>
                            </ul>
                        </section>

                        {/* Tokenomics */}
                        <section>
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">Value Proposition</h2>
                            <p className="text-[#c4a882] leading-relaxed mb-4">
                                The more trading activity, the more SOL fees generated, and the more BTC distributed to holders.
                                This creates a positive feedback loop:
                            </p>
                            <ul className="space-y-2 text-[#c4a882]">
                                <li>• High volume → More fees → More BTC rewards</li>
                                <li>• More rewards → More attractive to hold</li>
                                <li>• More holders → More trading → Repeat</li>
                            </ul>
                        </section>

                        {/* Links */}
                        <section className="glass-card p-8 text-center">
                            <h2 className="text-2xl font-bold text-gold-gradient mb-4">Links</h2>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href="https://x.com/BTC500fun" target="_blank" rel="noopener noreferrer" className="btn-gold">
                                    Twitter/X ↗
                                </a>
                                <a href="/" className="px-6 py-3 rounded-xl border border-[#d4a23a]/40 text-[#c4a882] hover:border-[#d4a23a] transition-colors">
                                    Dashboard
                                </a>
                            </div>
                        </section>
                    </div>
                </article>
            </div>
        </main>
    );
}
