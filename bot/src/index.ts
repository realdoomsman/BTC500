import cron from 'node-cron';
import { PublicKey } from '@solana/web3.js';
import { loadConfig, Config } from './config.js';
import { createWalletManager, WalletManager } from './wallet.js';
import { createJupiterSwapper, JupiterSwapper } from './jupiter.js';
import { createHolderManager, HolderManager } from './holders.js';
import { createDistributor, Distributor } from './distribute.js';
import { createDatabaseManager, DatabaseManager } from './db.js';
import { logger, createChildLogger } from './logger.js';

const log = createChildLogger('main');

interface BotContext {
    config: Config;
    wallet: WalletManager;
    jupiter: JupiterSwapper;
    holders: HolderManager;
    distributor: Distributor;
    db: DatabaseManager;
}

async function initializeBot(): Promise<BotContext> {
    log.info('Initializing BTC500 Distribution Bot...');

    const config = loadConfig();

    log.info({
        network: config.network,
        tokenMint: config.tokenMintAddress,
        wbtcMint: config.wbtcMintAddress,
        swapThreshold: config.swapThreshold,
        minSolBalance: config.minSolBalance,
        distributionCron: config.distributionCron,
        dryRun: config.dryRun,
    }, 'Configuration loaded');

    const db = createDatabaseManager();
    const wallet = createWalletManager(config);
    const jupiter = createJupiterSwapper(config, wallet);
    const holders = createHolderManager(config);
    const distributor = createDistributor(config, wallet, db);

    return { config, wallet, jupiter, holders, distributor, db };
}

async function executeCycle(ctx: BotContext): Promise<void> {
    const { config, wallet, jupiter, holders, distributor, db } = ctx;

    log.info('Starting distribution cycle...');

    try {
        // Step 1: Check distributable SOL
        const distributableSol = await wallet.getDistributableSol();
        log.info({ distributableSol, threshold: config.swapThreshold }, 'Checking balance');

        if (distributableSol < config.swapThreshold) {
            log.info('Insufficient SOL for swap, skipping cycle');
            return;
        }

        // Step 2: Execute swap
        const swapAmount = distributableSol; // Swap all available
        log.info({ swapAmount }, 'Executing swap SOL → wBTC');

        const swapRecordId = db.insertSwap({
            timestamp: new Date().toISOString(),
            sol_amount: swapAmount,
            btc_amount: 0, // Will update after swap
            tx_hash: 'pending',
            status: 'pending',
        });

        const swapResult = await jupiter.executeSwap(swapAmount);

        if (!swapResult.success) {
            db.updateSwapStatus(swapRecordId, 'failed', swapResult.error);
            log.error({ error: swapResult.error }, 'Swap failed');
            return;
        }

        // Update swap record with actual BTC amount and tx hash
        db.updateSwap(
            swapRecordId,
            swapResult.outputAmount,
            swapResult.txHash || '',
            'success'
        );

        log.info({
            inputSol: swapResult.inputAmount,
            outputBtc: swapResult.outputAmount,
            txHash: swapResult.txHash,
        }, 'Swap successful');

        // Step 3: Snapshot holders
        log.info('Taking holder snapshot...');
        const snapshot = await holders.getEligibleHolders();

        if (snapshot.holders.length === 0) {
            log.warn('No eligible holders found, skipping distribution');
            return;
        }

        // Step 4: Distribute wBTC
        log.info({ holderCount: snapshot.holders.length }, 'Distributing wBTC to holders');

        const distResult = await distributor.distribute(
            swapResult.outputAmount,
            snapshot.holders
        );

        log.info({
            distributionId: distResult.distributionId,
            success: distResult.success,
            successfulTransfers: distResult.successfulTransfers,
            failedTransfers: distResult.failedTransfers,
        }, 'Distribution cycle complete');

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error({ error: msg }, 'Distribution cycle failed');
    }
}

async function main(): Promise<void> {
    const ctx = await initializeBot();

    // Check for --once flag (single execution)
    const runOnce = process.argv.includes('--once');

    if (runOnce) {
        log.info('Running single execution cycle...');
        await executeCycle(ctx);
        ctx.db.close();
        return;
    }

    // Schedule recurring execution
    log.info({ cron: ctx.config.distributionCron }, 'Scheduling distribution cycles');

    const task = cron.schedule(ctx.config.distributionCron, async () => {
        await executeCycle(ctx);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        log.info({ signal }, 'Received shutdown signal');
        task.stop();
        ctx.db.close();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Run initial cycle immediately
    log.info('Running initial cycle...');
    await executeCycle(ctx);

    log.info('Bot is running. Press Ctrl+C to stop.');
}

main().catch((error) => {
    logger.error({ error: error.message }, 'Fatal error');
    process.exit(1);
});
