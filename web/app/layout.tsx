import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'BTC500 | Bitcoin Rewards Distribution',
    description: 'Automated Bitcoin rewards distribution for Pump.fun token holders. Track your BTC rewards in real-time.',
    keywords: ['Bitcoin', 'Solana', 'Pump.fun', 'wBTC', 'Token Rewards', 'Crypto'],
    openGraph: {
        title: 'BTC500 | Bitcoin Rewards Distribution',
        description: 'Automated Bitcoin rewards distribution for Pump.fun token holders.',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
