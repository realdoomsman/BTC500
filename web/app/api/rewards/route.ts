import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

function getClient() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        return null;
    }

    return createClient({ url, authToken });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    if (wallet.length < 32 || wallet.length > 44) {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const client = getClient();

    if (!client) {
        return NextResponse.json({
            tokenBalance: 0,
            btcEarned: 0,
            distributions: 0,
            transfers: [],
        });
    }

    try {
        const result = await client.execute({
            sql: `SELECT btc_amount, tx_hash, distribution_id FROM transfers WHERE holder_address = ? AND status = 'success' ORDER BY id DESC`,
            args: [wallet]
        });

        const transfers = result.rows;
        const totalEarned = transfers.reduce((sum, t) => sum + Number(t.btc_amount), 0);

        client.close();

        return NextResponse.json({
            tokenBalance: 0,
            btcEarned: totalEarned,
            distributions: transfers.length,
            transfers: transfers.slice(0, 10).map(t => ({
                amount: Number(t.btc_amount),
                txHash: t.tx_hash,
            })),
        });

    } catch (error) {
        console.error('Rewards API error:', error);
        return NextResponse.json({
            tokenBalance: 0,
            btcEarned: 0,
            distributions: 0,
            transfers: [],
        });
    }
}
