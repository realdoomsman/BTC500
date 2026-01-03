import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '..', 'bot', 'data', 'btc500.db');

export async function GET() {
    try {
        // Check if database exists (means bot has run at least once)
        if (!fs.existsSync(DB_PATH)) {
            return NextResponse.json({
                isLive: false,
                lastActivity: null,
                nextRun: getNextDistributionTime(),
                currentAction: null,
            });
        }

        const db = new Database(DB_PATH, { readonly: true });

        // Get most recent activity
        const lastSwap = db.prepare(`
      SELECT timestamp FROM swaps ORDER BY timestamp DESC LIMIT 1
    `).get() as { timestamp: string } | undefined;

        const lastDist = db.prepare(`
      SELECT timestamp FROM distributions ORDER BY timestamp DESC LIMIT 1
    `).get() as { timestamp: string } | undefined;

        // Check for pending/in_progress distributions (bot is actively working)
        const activeWork = db.prepare(`
      SELECT * FROM distributions WHERE status = 'in_progress' LIMIT 1
    `).get();

        db.close();

        // Determine last activity
        let lastActivity: string | null = null;
        if (lastSwap && lastDist) {
            lastActivity = new Date(lastSwap.timestamp) > new Date(lastDist.timestamp)
                ? lastSwap.timestamp
                : lastDist.timestamp;
        } else if (lastSwap) {
            lastActivity = lastSwap.timestamp;
        } else if (lastDist) {
            lastActivity = lastDist.timestamp;
        }

        // Consider bot "live" if activity within last 20 minutes
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
