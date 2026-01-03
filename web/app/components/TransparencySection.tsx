'use client';

import { FC } from 'react';

const DEV_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET || 'Configure in .env';
const TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT || 'Configure in .env';
const WBTC_MINT = '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh';

interface AddressRowProps {
    label: string;
    address: string;
    description: string;
}

const AddressRow: FC<AddressRowProps> = ({ label, address, description }) => {
    const isConfigured = !address.includes('Configure');
    const truncate = (addr: string) => addr.length > 20 ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : addr;

    const handleCopy = () => navigator.clipboard.writeText(address);

    return (
        <div className="flex items-center justify-between py-3 border-b border-[#d4a23a]/10 last:border-0">
            <div>
                <div className="text-[#e8d5c4] font-medium text-sm">{label}</div>
                <div className="text-[#8b7355] text-xs">{description}</div>
            </div>
            {isConfigured ? (
                <div className="flex items-center gap-2">
                    <a
                        href={`https://solscan.io/account/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-[#c4a882] hover:text-[#d4a23a] transition-colors"
                    >
                        {truncate(address)} ↗
                    </a>
                    <button onClick={handleCopy} className="text-[#8b7355] hover:text-[#d4a23a] transition-colors p-1" title="Copy">
                        📋
                    </button>
                </div>
            ) : (
                <span className="text-[#6b5846] text-sm">{address}</span>
            )}
        </div>
    );
};

const Step: FC<{ num: number; title: string; desc: string }> = ({ num, title, desc }) => (
    <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#d4a23a]/10 flex items-center justify-center">
            <span className="text-gold-gradient font-bold">{num}</span>
        </div>
        <div>
            <div className="text-[#e8d5c4] font-medium">{title}</div>
            <div className="text-[#8b7355] text-sm">{desc}</div>
        </div>
    </div>
);

export const TransparencySection: FC = () => {
    return (
        <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#d4a23a]/10">
                <div className="p-6">
                    <h3 className="text-[#e8d5c4] font-semibold mb-4">Contract Addresses</h3>
                    <AddressRow label="Dev Wallet" address={DEV_WALLET} description="Receives Pump.fun fees" />
                    <AddressRow label="Token" address={TOKEN_MINT} description="Your token contract" />
                    <AddressRow label="wBTC" address={WBTC_MINT} description="Wormhole Bitcoin" />
                </div>

                <div className="p-6">
                    <h3 className="text-[#e8d5c4] font-semibold mb-4">Process</h3>
                    <div className="space-y-4">
                        <Step num={1} title="Collect Fees" desc="SOL from trades goes to dev wallet" />
                        <Step num={2} title="Swap to BTC" desc="Bot swaps SOL → wBTC via Jupiter" />
                        <Step num={3} title="Distribute" desc="wBTC sent to all token holders" />
                    </div>
                </div>
            </div>

            <div className="border-t border-[#d4a23a]/10 p-6 bg-[#d4a23a]/5">
                <h4 className="text-[#e8d5c4] font-medium mb-3">How Stats Work</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-[#d4a23a]">Total SOL</span>
                        <span className="text-[#8b7355]"> — Sum of all SOL swapped</span>
                    </div>
                    <div>
                        <span className="text-[#d4a23a]">Total BTC</span>
                        <span className="text-[#8b7355]"> — Sum of all wBTC distributed</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
