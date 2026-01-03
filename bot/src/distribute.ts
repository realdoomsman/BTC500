import {
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
    TransactionInstruction
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAccount
} from '@solana/spl-token';
import { Config } from './config.js';
import { WalletManager } from './wallet.js';
import { DatabaseManager, TransferRecord } from './db.js';
import { TokenHolder } from './holders.js';
import { createChildLogger } from './logger.js';
import { randomUUID } from 'crypto';

const log = createChildLogger('distribute');

// Batch size for transfers (to fit in single transaction)
const TRANSFERS_PER_TX = 5;
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;

export interface DistributionResult {
    distributionId: string;
    success: boolean;
    totalBtc: number;
    successfulTransfers: number;
    failedTransfers: number;
    txHashes: string[];
    errors: string[];
}

export interface Distributor {
    distribute(totalBtc: number, holders: TokenHolder[]): Promise<DistributionResult>;
    retryPending(distributionId: string): Promise<DistributionResult>;
}

export function createDistributor(
    config: Config,
    wallet: WalletManager,
    db: DatabaseManager
): Distributor {
    const wbtcMint = new PublicKey(config.wbtcMintAddress);

    async function ensureTokenAccount(owner: PublicKey): Promise<PublicKey> {
        const ata = await getAssociatedTokenAddress(wbtcMint, owner);

        try {
            await getAccount(wallet.connection, ata);
            return ata;
        } catch {
            // Account doesn't exist, will create in batch
            return ata;
        }
    }

    async function createTransferBatch(
        transfers: Array<{ holder: string; amount: number; transferId: number }>
    ): Promise<{ success: boolean; txHash?: string; errors: string[] }> {
        const instructions: TransactionInstruction[] = [];
        const errors: string[] = [];

        const sourceAta = await getAssociatedTokenAddress(wbtcMint, wallet.publicKey);

        for (const transfer of transfers) {
            try {
                const destOwner = new PublicKey(transfer.holder);
                const destAta = await getAssociatedTokenAddress(wbtcMint, destOwner);

                // Check if destination ATA exists
                try {
                    await getAccount(wallet.connection, destAta);
                } catch {
                    // Create ATA instruction
                    instructions.push(
                        createAssociatedTokenAccountInstruction(
                            wallet.publicKey,
                            destAta,
                            destOwner,
                            wbtcMint,
                            TOKEN_PROGRAM_ID,
                            ASSOCIATED_TOKEN_PROGRAM_ID
                        )
                    );
                }

                // Transfer instruction
                instructions.push(
                    createTransferInstruction(
                        sourceAta,
                        destAta,
                        wallet.publicKey,
                        BigInt(transfer.amount),
                        [],
                        TOKEN_PROGRAM_ID
                    )
                );

            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                errors.push(`Failed to prepare transfer for ${transfer.holder}: ${msg}`);
                db.updateTransferStatus(transfer.transferId, 'failed', undefined, msg);
            }
        }

        if (instructions.length === 0) {
            return { success: false, errors };
        }

        if (config.dryRun) {
            log.info({ transferCount: transfers.length }, 'DRY RUN: Skipping transfer batch');
            for (const transfer of transfers) {
                db.updateTransferStatus(transfer.transferId, 'success', 'DRY_RUN');
            }
            return { success: true, txHash: 'DRY_RUN_NO_TX', errors };
        }

        // Build and send transaction
        const { blockhash, lastValidBlockHeight } = await wallet.connection.getLatestBlockhash();

        const message = new TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: blockhash,
            instructions,
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);

        const signature = await wallet.signAndSendTransaction(tx);

        // Update transfer records
        for (const transfer of transfers) {
            db.updateTransferStatus(transfer.transferId, 'success', signature);
        }

        return { success: true, txHash: signature, errors };
    }

    async function distribute(
        totalBtc: number,
        holders: TokenHolder[]
    ): Promise<DistributionResult> {
        const distributionId = randomUUID();
        const txHashes: string[] = [];
        const errors: string[] = [];
        let successfulTransfers = 0;
        let failedTransfers = 0;

        log.info({
            distributionId,
            totalBtc,
            holderCount: holders.length,
        }, 'Starting distribution');

        // Create distribution record
        const distRecordId = db.insertDistribution({
            distribution_id: distributionId,
            timestamp: new Date().toISOString(),
            total_btc: totalBtc,
            holder_count: holders.length,
            status: 'in_progress',
        });

        try {
            // Calculate individual amounts and create transfer records
            const transferQueue: Array<{
                holder: string;
                amount: number;
                transferId: number
            }> = [];

            for (const holder of holders) {
                const amount = Math.floor(totalBtc * holder.share);
                if (amount <= 0) continue;

                const transferId = db.insertTransfer({
                    distribution_id: distributionId,
                    holder_address: holder.address,
                    btc_amount: amount,
                    status: 'pending',
                });

                transferQueue.push({ holder: holder.address, amount, transferId });
            }

            log.info({ queueSize: transferQueue.length }, 'Transfer queue created');

            // Process in batches
            for (let i = 0; i < transferQueue.length; i += TRANSFERS_PER_TX) {
                const batch = transferQueue.slice(i, i + TRANSFERS_PER_TX);

                let retries = 0;
                let batchSuccess = false;

                while (retries < MAX_RETRIES && !batchSuccess) {
                    try {
                        const result = await createTransferBatch(batch);

                        if (result.success) {
                            batchSuccess = true;
                            successfulTransfers += batch.length;
                            if (result.txHash) {
                                txHashes.push(result.txHash);
                            }
                        }

                        errors.push(...result.errors);

                    } catch (error) {
                        retries++;
                        const msg = error instanceof Error ? error.message : String(error);
                        log.warn({
                            batch: i / TRANSFERS_PER_TX,
                            retry: retries,
                            error: msg
                        }, 'Batch failed, retrying...');

                        if (retries >= MAX_RETRIES) {
                            failedTransfers += batch.length;
                            errors.push(`Batch ${i / TRANSFERS_PER_TX} failed after ${MAX_RETRIES} retries: ${msg}`);

                            // Mark transfers as failed
                            for (const transfer of batch) {
                                db.updateTransferStatus(transfer.transferId, 'failed', undefined, msg);
                            }
                        } else {
                            await new Promise(r => setTimeout(r, RETRY_DELAY_MS * retries));
                        }
                    }
                }

                // Small delay between batches to avoid rate limiting
                if (i + TRANSFERS_PER_TX < transferQueue.length) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            // Update distribution status
            const finalStatus = failedTransfers === 0 ? 'success' :
                successfulTransfers === 0 ? 'failed' :
                    'success'; // Partial success still counts

            db.updateDistributionStatus(
                distRecordId,
                finalStatus,
                errors.length > 0 ? errors.join('; ') : undefined
            );

            log.info({
                distributionId,
                successfulTransfers,
                failedTransfers,
                txCount: txHashes.length,
            }, 'Distribution completed');

            return {
                distributionId,
                success: failedTransfers === 0,
                totalBtc,
                successfulTransfers,
                failedTransfers,
                txHashes,
                errors,
            };

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            db.updateDistributionStatus(distRecordId, 'failed', msg);

            log.error({ distributionId, error: msg }, 'Distribution failed');

            return {
                distributionId,
                success: false,
                totalBtc,
                successfulTransfers,
                failedTransfers: holders.length - successfulTransfers,
                txHashes,
                errors: [msg, ...errors],
            };
        }
    }

    async function retryPending(distributionId: string): Promise<DistributionResult> {
        const pending = db.getPendingTransfers(distributionId);

        if (pending.length === 0) {
            return {
                distributionId,
                success: true,
                totalBtc: 0,
                successfulTransfers: 0,
                failedTransfers: 0,
                txHashes: [],
                errors: [],
            };
        }

        log.info({ distributionId, pendingCount: pending.length }, 'Retrying pending transfers');

        const holders: TokenHolder[] = pending.map(t => ({
            address: t.holder_address,
            balance: 0,
            share: 0, // Will calculate from btc_amount directly
        }));

        const totalBtc = pending.reduce((sum, t) => sum + t.btc_amount, 0);

        // Recalculate shares based on stored amounts
        for (let i = 0; i < holders.length; i++) {
            holders[i].share = pending[i].btc_amount / totalBtc;
        }

        return distribute(totalBtc, holders);
    }

    return {
        distribute,
        retryPending,
    };
}
