import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

function getClient() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        return null;
    }

    return createClient({ url, authToken });
}

export async function GET() {
    const client = getClient();

    if (!client) {
        // Return zeros if not configured
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

    try {
        // Get totals
        const totalsResult = await client.execute(
            `SELECT COALESCE(SUM(sol_amount), 0) as total_sol, COALESCE(SUM(btc_amount), 0) as total_btc FROM swaps WHERE status = 'success'`
        );
        const totals = totalsResult.rows[0];

        const distTotalResult = await client.execute(
            `SELECT COALESCE(SUM(total_btc), 0) as total, COUNT(*) as count FROM distributions WHERE status = 'success'`
        );
        const distTotal = distTotalResult.rows[0];

        // Get last distribution
        const lastDistResult = await client.execute(
            `SELECT * FROM distributions ORDER BY timestamp DESC LIMIT 1`
        );
        const lastDist = lastDistResult.rows[0];

        // Get recent swaps
        const recentSwapsResult = await client.execute(
            `SELECT timestamp, sol_amount as solAmount, btc_amount as btcAmount, tx_hash as txHash FROM swaps WHERE status = 'success' ORDER BY timestamp DESC LIMIT 10`
        );

        // Get recent distributions
        const recentDistResult = await client.execute(
            `SELECT timestamp, total_btc as btcAmount, holder_count as holderCount, distribution_id as txHash FROM distributions WHERE status = 'success' ORDER BY timestamp DESC LIMIT 10`
        );

        client.close();

        return NextResponse.json({
            totalSolCollected: Number(totals?.total_sol || 0),
            totalBtcDistributed: Number(distTotal?.total || 0) / 1e8,
            lastSwapTimestamp: lastDist?.timestamp || null,
            nextDistributionTimestamp: getNextDistributionTime(),
            holderCount: Number(lastDist?.holder_count || 0),
            distributionCount: Number(distTotal?.count || 0),
            recentSwaps: recentSwapsResult.rows.map(r => ({
                ...r,
                btcAmount: Number(r.btcAmount) / 1e8
            })),
            recentDistributions: recentDistResult.rows.map(r => ({
                ...r,
                btcAmount: Number(r.btcAmount) / 1e8
            })),
        });

    } catch (error) {
        console.error('Stats API error:', error);
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
