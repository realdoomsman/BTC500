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
}

export function createDistributor(
    config: Config,
    wallet: WalletManager,
    db: DatabaseManager
): Distributor {
    const wbtcMint = new PublicKey(config.wbtcMintAddress);

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

                try {
                    await getAccount(wallet.connection, destAta);
                } catch {
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
                await db.updateTransferStatus(transfer.transferId, 'failed', undefined, msg);
            }
        }

        if (instructions.length === 0) {
            return { success: false, errors };
        }

        if (config.dryRun) {
            log.info({ transferCount: transfers.length }, 'DRY RUN: Skipping transfer batch');
            for (const transfer of transfers) {
                await db.updateTransferStatus(transfer.transferId, 'success', 'DRY_RUN');
            }
            return { success: true, txHash: 'DRY_RUN_NO_TX', errors };
        }

        const { blockhash } = await wallet.connection.getLatestBlockhash();

        const message = new TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: blockhash,
            instructions,
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);
        const signature = await wallet.signAndSendTransaction(tx);

        for (const transfer of transfers) {
            await db.updateTransferStatus(transfer.transferId, 'success', signature);
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

        log.info({ distributionId: distributionId.slice(0, 8), totalBtc, holderCount: holders.length }, 'Starting distribution');

        const distRecordId = await db.insertDistribution({
            distribution_id: distributionId,
            timestamp: new Date().toISOString(),
            total_btc: totalBtc,
            holder_count: holders.length,
            status: 'in_progress',
        });

        try {
            const transferQueue: Array<{ holder: string; amount: number; transferId: number }> = [];

            for (const holder of holders) {
                const amount = Math.floor(totalBtc * holder.share);
                if (amount <= 0) continue;

                const transferId = await db.insertTransfer({
                    distribution_id: distributionId,
                    holder_address: holder.address,
                    btc_amount: amount,
                    status: 'pending',
                });

                transferQueue.push({ holder: holder.address, amount, transferId });
            }

            log.info({ queueSize: transferQueue.length }, 'Transfer queue created');

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
                            if (result.txHash) txHashes.push(result.txHash);
                        }
                        errors.push(...result.errors);

                    } catch (error) {
                        retries++;
                        const msg = error instanceof Error ? error.message : String(error);
                        log.warn({ batch: i / TRANSFERS_PER_TX, retry: retries, error: msg }, 'Batch failed, retrying...');

                        if (retries >= MAX_RETRIES) {
                            failedTransfers += batch.length;
                            errors.push(`Batch ${i / TRANSFERS_PER_TX} failed: ${msg}`);

                            for (const transfer of batch) {
                                await db.updateTransferStatus(transfer.transferId, 'failed', undefined, msg);
                            }
                        } else {
                            await new Promise(r => setTimeout(r, RETRY_DELAY_MS * retries));
                        }
                    }
                }

                if (i + TRANSFERS_PER_TX < transferQueue.length) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            const finalStatus = failedTransfers === 0 ? 'success' : 'success';
            await db.updateDistributionStatus(distRecordId, finalStatus, errors.length > 0 ? errors.join('; ') : undefined);

            log.info({ distributionId: distributionId.slice(0, 8), successfulTransfers, failedTransfers, txCount: txHashes.length }, 'Distribution completed');

            return { distributionId, success: failedTransfers === 0, totalBtc, successfulTransfers, failedTransfers, txHashes, errors };

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            await db.updateDistributionStatus(distRecordId, 'failed', msg);
            log.error({ distributionId: distributionId.slice(0, 8), error: msg }, 'Distribution failed');

            return { distributionId, success: false, totalBtc, successfulTransfers, failedTransfers: holders.length - successfulTransfers, txHashes, errors: [msg, ...errors] };
        }
    }

    return { distribute };
}
