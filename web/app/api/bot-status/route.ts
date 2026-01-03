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
        return NextResponse.json({
            isLive: false,
            lastActivity: null,
            nextRun: getNextDistributionTime(),
            currentAction: null,
        });
    }

    try {
        // Get most recent activity
        const lastSwapResult = await client.execute(
            `SELECT timestamp FROM swaps ORDER BY timestamp DESC LIMIT 1`
        );
        const lastSwap = lastSwapResult.rows[0];

        const lastDistResult = await client.execute(
            `SELECT timestamp FROM distributions ORDER BY timestamp DESC LIMIT 1`
        );
        const lastDist = lastDistResult.rows[0];

        // Check for in-progress distributions
        const activeResult = await client.execute(
            `SELECT * FROM distributions WHERE status = 'in_progress' LIMIT 1`
        );
        const activeWork = activeResult.rows[0];

        client.close();

        // Determine last activity
        let lastActivity: string | null = null;
        if (lastSwap?.timestamp && lastDist?.timestamp) {
            lastActivity = new Date(String(lastSwap.timestamp)) > new Date(String(lastDist.timestamp))
                ? String(lastSwap.timestamp)
                : String(lastDist.timestamp);
        } else if (lastSwap?.timestamp) {
            lastActivity = String(lastSwap.timestamp);
        } else if (lastDist?.timestamp) {
            lastActivity = String(lastDist.timestamp);
        }

        // Bot is "live" if activity within last 20 minutes
        const isLive = lastActivity
            ? (Date.now() - new Date(lastActivity).getTime()) < 20 * 60 * 1000
            : false;

        let currentAction: string | null = null;
        if (activeWork) {
            currentAction = 'Distributing to holders...';
        } else if (isLive && lastActivity) {
            const secondsAgo = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 1000);
            if (secondsAgo < 30) {
                currentAction = 'Completed distribution';
            }
        }

        return NextResponse.json({
            isLive,
            lastActivity,
            nextRun: getNextDistributionTime(),
            currentAction,
        });

    } catch (error) {
        console.error('Bot status error:', error);
        return NextResponse.json({
            isLive: false,
            lastActivity: null,
            nextRun: getNextDistributionTime(),
            currentAction: null,
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
