import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Path to the bot's database
const DB_PATH = path.join(process.cwd(), '..', 'bot', 'data', 'btc500.db');

interface SwapRecord {
    timestamp: string;
    sol_amount: number;
    btc_amount: number;
    tx_hash: string;
    status: string;
}

interface DistributionRecord {
    timestamp: string;
    total_btc: number;
    holder_count: number;
    distribution_id: string;
    status: string;
}

export async function GET() {
    try {
        // Check if database exists
        if (!fs.existsSync(DB_PATH)) {
            // Return zeros if bot hasn't run yet
            return NextResponse.json({
                totalSolCollected: 0,
                totalBtcDistributed: 0,
                lastSwapTimestamp: null,
                nextDistributionTimestamp: getNextDistributionTime(),
                holderCount: 0,
                distributionCount: 0,
                recentSwaps: [],
                recentDistributions: [],
            });
        }

        const db = new Database(DB_PATH, { readonly: true });

        // Get totals
        const totals = db.prepare(`
      SELECT COALESCE(SUM(sol_amount), 0) as total_sol, 
             COALESCE(SUM(btc_amount), 0) as total_btc 
      FROM swaps WHERE status = 'success'
    `).get() as { total_sol: number; total_btc: number };

        const distTotal = db.prepare(`
      SELECT COALESCE(SUM(total_btc), 0) as total,
             COUNT(*) as count
      FROM distributions WHERE status = 'success'
    `).get() as { total: number; count: number };

        // Get last distribution
        const lastDist = db.prepare(`
      SELECT * FROM distributions ORDER BY timestamp DESC LIMIT 1
    `).get() as DistributionRecord | undefined;

        // Get recent swaps
        const recentSwaps = db.prepare(`
      SELECT timestamp, sol_amount as solAmount, btc_amount as btcAmount, tx_hash as txHash
      FROM swaps WHERE status = 'success' 
      ORDER BY timestamp DESC LIMIT 10
    `).all() as Array<{ timestamp: string; solAmount: number; btcAmount: number; txHash: string }>;

        // Get recent distributions
        const recentDistributions = db.prepare(`
      SELECT timestamp, total_btc as btcAmount, holder_count as holderCount, distribution_id as txHash
      FROM distributions WHERE status = 'success'
      ORDER BY timestamp DESC LIMIT 10
    `).all() as Array<{ timestamp: string; btcAmount: number; holderCount: number; txHash: string }>;

        db.close();

        return NextResponse.json({
            totalSolCollected: totals.total_sol,
            totalBtcDistributed: distTotal.total,
            lastSwapTimestamp: lastDist?.timestamp || null,
            nextDistributionTimestamp: getNextDistributionTime(),
            holderCount: lastDist?.holder_count || 0,
            distributionCount: distTotal.count,
            recentSwaps,
            recentDistributions,
        });

    } catch (error) {
        console.error('Stats API error:', error);
        // Return zeros on error
        return NextResponse.json({
            totalSolCollected: 0,
            totalBtcDistributed: 0,
            lastSwapTimestamp: null,
            nextDistributionTimestamp: getNextDistributionTime(),
            holderCount: 0,
            distributionCount: 0,
            recentSwaps: [],
            recentDistributions: [],
        });
    }
}

function getNextDistributionTime(): string {
    const now = new Date();
    const minutes = now.getMinutes();
    const nextInterval = Math.ceil((minutes + 1) / 15) * 15;
    const next = new Date(now);
    next.setMinutes(nextInterval);
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next.toISOString();
}
