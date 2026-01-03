import cron from 'node-cron';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
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

/**
 * Validates configuration and connectivity before starting
 */
async function runStartupChecks(config: Config, wallet: WalletManager): Promise<boolean> {
    log.info('Running startup checks...');
    let allPassed = true;

    // Check 1: Wallet loaded
    log.info({ publicKey: wallet.publicKey.toBase58() }, '✓ Wallet loaded');

    // Check 2: RPC connectivity
    try {
        const balance = await wallet.getBalance();
        log.info({ balance: `${balance.toFixed(4)} SOL` }, '✓ RPC connected');
    } catch (error) {
        log.error({ error: (error as Error).message }, '✗ RPC connection failed');
        allPassed = false;
    }

    // Check 3: Token mint exists
    try {
        const tokenMint = new PublicKey(config.tokenMintAddress);
        const info = await wallet.connection.getAccountInfo(tokenMint);
        if (info) {
            log.info({ mint: config.tokenMintAddress }, '✓ Token mint verified');
        } else {
            log.warn({ mint: config.tokenMintAddress }, '⚠ Token mint not found - may not exist yet');
        }
    } catch (error) {
        log.error({ error: (error as Error).message, mint: config.tokenMintAddress }, '✗ Invalid token mint');
        allPassed = false;
    }

    // Check 4: wBTC mint exists
    try {
        const wbtcMint = new PublicKey(config.wbtcMintAddress);
        const info = await wallet.connection.getAccountInfo(wbtcMint);
        if (info) {
            log.info({ mint: config.wbtcMintAddress.slice(0, 8) + '...' }, '✓ wBTC mint verified');
        } else {
            log.error('✗ wBTC mint not found');
            allPassed = false;
        }
    } catch (error) {
        log.error({ error: (error as Error).message }, '✗ Invalid wBTC mint');
        allPassed = false;
    }

    // Check 5: Helius API key
    if (config.heliusApiKey && config.heliusApiKey.length > 10) {
        log.info('✓ Helius API key configured');
    } else {
        log.warn('⚠ Helius API key may be missing - holder queries may fail');
    }

    // Check 6: Current balance status
    const distributable = await wallet.getDistributableSol();
    if (distributable >= config.swapThreshold) {
        log.info({
            distributable: `${distributable.toFixed(4)} SOL`,
            threshold: `${config.swapThreshold} SOL`
        }, '✓ Ready to swap on next cycle');
    } else {
        log.info({
            distributable: `${distributable.toFixed(4)} SOL`,
            needed: `${config.swapThreshold} SOL`
        }, 'ℹ Waiting for more SOL');
    }

    return allPassed;
}

async function initializeBot(): Promise<BotContext> {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                      BTC500 Distribution Bot                   ║
║                   Automated Bitcoin Rewards                    ║
╚═══════════════════════════════════════════════════════════════╝
`);

    log.info('Initializing...');

    const config = loadConfig();

    log.info({
        network: config.network,
        tokenMint: config.tokenMintAddress.slice(0, 8) + '...',
        swapThreshold: `${config.swapThreshold} SOL`,
        minSolBalance: `${config.minSolBalance} SOL`,
        schedule: config.distributionCron,
        dryRun: config.dryRun,
    }, 'Configuration');

    const db = createDatabaseManager();
    const wallet = createWalletManager(config);
    const jupiter = createJupiterSwapper(config, wallet);
    const holders = createHolderManager(config);
    const distributor = createDistributor(config, wallet, db);

    // Run startup checks
    const checksOk = await runStartupChecks(config, wallet);
    if (!checksOk) {
        log.warn('Some startup checks failed - bot will continue but may encounter errors');
    }

    return { config, wallet, jupiter, holders, distributor, db };
}

async function executeCycle(ctx: BotContext): Promise<void> {
    const { config, wallet, jupiter, holders, distributor, db } = ctx;
    const cycleStart = Date.now();

    log.info('════════════════════════════════════════════════════');
    log.info('Starting distribution cycle');
    log.info('════════════════════════════════════════════════════');

    try {
        // Step 1: Check distributable SOL
        const distributableSol = await wallet.getDistributableSol();
        const totalBalance = await wallet.getBalance();

        log.info({
            totalBalance: `${totalBalance.toFixed(4)} SOL`,
            distributable: `${distributableSol.toFixed(4)} SOL`,
            threshold: `${config.swapThreshold} SOL`,
            safetyFloor: `${config.minSolBalance} SOL`
        }, 'Balance check');

        if (distributableSol < config.swapThreshold) {
            log.info(`Insufficient SOL (need ${config.swapThreshold} SOL), waiting for more fees`);
            return;
        }

        // Step 2: Execute swap
        const swapAmount = distributableSol;
        log.info({ amount: `${swapAmount.toFixed(4)} SOL` }, 'Swapping SOL → wBTC');

        const swapRecordId = db.insertSwap({
            timestamp: new Date().toISOString(),
            sol_amount: swapAmount,
            btc_amount: 0,
            tx_hash: 'pending',
            status: 'pending',
        });

        const swapResult = await jupiter.executeSwap(swapAmount);

        if (!swapResult.success) {
            db.updateSwapStatus(swapRecordId, 'failed', swapResult.error);
            log.error({ error: swapResult.error }, 'Swap failed');
            return;
        }

        db.updateSwap(
            swapRecordId,
            swapResult.outputAmount,
            swapResult.txHash || '',
            'success'
        );

        log.info({
            inputSol: `${swapResult.inputAmount.toFixed(4)} SOL`,
            outputBtc: swapResult.outputAmount,
            txHash: swapResult.txHash?.slice(0, 12) + '...',
        }, '✓ Swap successful');

        // Step 3: Snapshot holders
        log.info('Taking holder snapshot...');
        const snapshot = await holders.getEligibleHolders();

        if (snapshot.holders.length === 0) {
            log.warn('No eligible holders found - skipping distribution (tokens may not be distributed yet)');
            return;
        }

        log.info({
            holderCount: snapshot.holders.length,
            totalBalance: snapshot.totalEligibleBalance
        }, '✓ Holder snapshot complete');

        // Step 4: Distribute wBTC
        log.info({
            amount: swapResult.outputAmount,
            recipients: snapshot.holders.length
        }, 'Distributing wBTC');

        const distResult = await distributor.distribute(
            swapResult.outputAmount,
            snapshot.holders
        );

        const duration = ((Date.now() - cycleStart) / 1000).toFixed(1);

        log.info({
            distributionId: distResult.distributionId.slice(0, 8) + '...',
            success: distResult.success,
            successfulTransfers: distResult.successfulTransfers,
            failedTransfers: distResult.failedTransfers,
            txCount: distResult.txHashes.length,
            duration: `${duration}s`
        }, '✓ Distribution complete');

        log.info('════════════════════════════════════════════════════');

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error({ error: msg }, 'Cycle failed with error');
    }
}

async function main(): Promise<void> {
    const ctx = await initializeBot();

    // Check for --once flag
    const runOnce = process.argv.includes('--once');

    if (runOnce) {
        log.info('Running single execution (--once flag)');
        await executeCycle(ctx);
        ctx.db.close();
        log.info('Done!');
        return;
    }

    // Schedule recurring execution
    log.info({ schedule: ctx.config.distributionCron }, 'Scheduling distribution cycles');
    log.info('Press Ctrl+C to stop\n');

    const task = cron.schedule(ctx.config.distributionCron, async () => {
        await executeCycle(ctx);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        log.info({ signal }, 'Shutting down...');
        task.stop();
        ctx.db.close();
        log.info('Goodbye!');
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Run initial cycle
    log.info('Running initial cycle...');
    await executeCycle(ctx);
}

main().catch((error) => {
    logger.error({ error: error.message }, 'Fatal error');
    process.exit(1);
});
