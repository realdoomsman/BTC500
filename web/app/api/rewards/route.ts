import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '..', 'bot', 'data', 'btc500.db');

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Validate wallet address format (basic check)
    if (wallet.length < 32 || wallet.length > 44) {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    try {
        // Check if database exists
        if (!fs.existsSync(DB_PATH)) {
            return NextResponse.json({
                tokenBalance: 0,
                btcEarned: 0,
                distributions: 0,
                transfers: [],
            });
        }

        const db = new Database(DB_PATH, { readonly: true });

        // Get transfers for this wallet
        const transfers = db.prepare(`
      SELECT btc_amount, tx_hash, distribution_id, status
      FROM transfers 
      WHERE holder_address = ? AND status = 'success'
      ORDER BY id DESC
    `).all(wallet) as Array<{ btc_amount: number; tx_hash: string; distribution_id: string; status: string }>;

        const totalEarned = transfers.reduce((sum, t) => sum + t.btc_amount, 0);

        db.close();

        return NextResponse.json({
            tokenBalance: 0, // Would need on-chain query for actual balance
            btcEarned: totalEarned,
            distributions: transfers.length,
            transfers: transfers.slice(0, 10).map(t => ({
                amount: t.btc_amount,
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
