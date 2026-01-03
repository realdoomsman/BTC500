import { PublicKey } from '@solana/web3.js';
import { Config } from './config.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('holders');

export interface TokenHolder {
    address: string;
    balance: number;
    share: number;  // Proportional share (0-1)
}

export interface HolderSnapshot {
    timestamp: string;
    totalEligibleBalance: number;
    holders: TokenHolder[];
}

interface HeliusTokenAccount {
    address: string;
    owner: string;
    amount: number;
    decimals: number;
}

interface HeliusResponse {
    total: number;
    limit: number;
    page: number;
    token_accounts: HeliusTokenAccount[];
}

export interface HolderManager {
    getEligibleHolders(): Promise<HolderSnapshot>;
    calculateDistribution(totalBtc: number, holders: TokenHolder[]): Map<string, number>;
}

export function createHolderManager(config: Config): HolderManager {
    // Use Helius DAS API for token accounts
    const heliusRpcUrl = config.rpcUrl;

    async function fetchAllTokenAccounts(): Promise<HeliusTokenAccount[]> {
        const allAccounts: HeliusTokenAccount[] = [];
        let cursor: string | undefined;

        log.info({ tokenMint: config.tokenMintAddress }, 'Fetching token accounts from Helius');

        do {
            const response = await fetch(heliusRpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'btc500',
                    method: 'getTokenAccounts',
                    params: {
                        mint: config.tokenMintAddress,
                        limit: 1000,
                        cursor: cursor,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as {
                error?: { message: string };
                result?: {
                    token_accounts: Array<{ address: string; owner: string; amount: string; decimals?: number }>;
                    cursor?: string;
                };
            };

            if (data.error) {
                throw new Error(`Helius API error: ${data.error.message}`);
            }

            const result = data.result;
            if (result && result.token_accounts) {
                for (const account of result.token_accounts) {
                    allAccounts.push({
                        address: account.address,
                        owner: account.owner,
                        amount: Number(account.amount),
                        decimals: account.decimals || 0,
                    });
                }
                cursor = result.cursor;
            } else {
                cursor = undefined;
            }

            log.debug({ accountsFetched: allAccounts.length, hasMore: !!cursor }, 'Fetched page');

            // Rate limiting protection
            if (cursor) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } while (cursor);

        log.info({ totalAccounts: allAccounts.length }, 'Finished fetching token accounts');
        return allAccounts;
    }

    async function getEligibleHolders(): Promise<HolderSnapshot> {
        const accounts = await fetchAllTokenAccounts();

        // Filter and process holders
        const holders: TokenHolder[] = [];
        let totalEligibleBalance = 0;

        for (const account of accounts) {
            // Skip if below minimum threshold
            if (account.amount < config.minHolderBalance) {
                continue;
            }

            // Apply max cap if configured (anti-whale)
            let effectiveBalance = account.amount;
            if (config.maxHolderBalance && account.amount > config.maxHolderBalance) {
                effectiveBalance = config.maxHolderBalance;
            }

            // Apply weighting
            let weightedBalance: number;
            if (config.distributionWeighting === 'sqrt') {
                weightedBalance = Math.sqrt(effectiveBalance);
            } else {
                weightedBalance = effectiveBalance;
            }

            holders.push({
                address: account.owner,
                balance: effectiveBalance,
                share: 0, // Will be calculated after totaling
            });

            totalEligibleBalance += weightedBalance;
        }

        // Calculate proportional shares
        for (const holder of holders) {
            let weightedBalance: number;
            if (config.distributionWeighting === 'sqrt') {
                weightedBalance = Math.sqrt(holder.balance);
            } else {
                weightedBalance = holder.balance;
            }
            holder.share = weightedBalance / totalEligibleBalance;
        }

        log.info({
            eligibleHolders: holders.length,
            totalEligibleBalance,
            weighting: config.distributionWeighting,
        }, 'Holder snapshot complete');

        return {
            timestamp: new Date().toISOString(),
            totalEligibleBalance,
            holders,
        };
    }

    function calculateDistribution(
        totalBtc: number,
        holders: TokenHolder[]
    ): Map<string, number> {
        const distribution = new Map<string, number>();

        for (const holder of holders) {
            const amount = Math.floor(totalBtc * holder.share);
            if (amount > 0) {
                distribution.set(holder.address, amount);
            }
        }

        log.info({
            totalBtc,
            recipients: distribution.size,
        }, 'Distribution calculated');

        return distribution;
    }

    return {
        getEligibleHolders,
        calculateDistribution,
    };
}
