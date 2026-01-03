import { createJupiterApiClient, QuoteResponse } from '@jup-ag/api';
import {
    Connection,
    PublicKey,
    VersionedTransaction,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { Config, SOL_MINT } from './config.js';
import { WalletManager } from './wallet.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('jupiter');

export interface SwapResult {
    success: boolean;
    inputAmount: number;    // SOL amount
    outputAmount: number;   // wBTC amount (in smallest units)
    txHash?: string;
    error?: string;
}

export interface JupiterSwapper {
    getQuote(solAmount: number): Promise<QuoteResponse>;
    executeSwap(solAmount: number): Promise<SwapResult>;
}

export function createJupiterSwapper(
    config: Config,
    wallet: WalletManager
): JupiterSwapper {
    const jupiter = createJupiterApiClient();

    async function getQuote(solAmount: number): Promise<QuoteResponse> {
        const inputMint = SOL_MINT;
        const outputMint = config.wbtcMintAddress;
        const amount = Math.floor(solAmount * LAMPORTS_PER_SOL);

        log.info({
            solAmount,
            lamports: amount,
            outputMint
        }, 'Fetching Jupiter quote');

        const quote = await jupiter.quoteGet({
            inputMint,
            outputMint,
            amount,
            slippageBps: config.slippageBps,
            onlyDirectRoutes: false,
            asLegacyTransaction: false,
        });

        if (!quote) {
            throw new Error('No quote available for SOL → wBTC swap');
        }

        log.info({
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            priceImpactPct: quote.priceImpactPct,
            routePlan: quote.routePlan?.map(r => r.swapInfo?.label).join(' → '),
        }, 'Quote received');

        return quote;
    }

    async function executeSwap(solAmount: number): Promise<SwapResult> {
        try {
            // Get distributable balance
            const distributable = await wallet.getDistributableSol();

            if (solAmount > distributable) {
                return {
                    success: false,
                    inputAmount: solAmount,
                    outputAmount: 0,
                    error: `Requested ${solAmount} SOL but only ${distributable} SOL available after safety floor`,
                };
            }

            // Get quote
            const quote = await getQuote(solAmount);

            // Validate minimum output
            const expectedOutput = BigInt(quote.outAmount);
            const minOutput = (expectedOutput * BigInt(config.minOutputBps)) / BigInt(10000);

            log.info({
                expectedOutput: expectedOutput.toString(),
                minOutput: minOutput.toString(),
                minOutputBps: config.minOutputBps,
            }, 'Output validation');

            if (config.dryRun) {
                log.info('DRY RUN: Skipping actual swap execution');
                return {
                    success: true,
                    inputAmount: solAmount,
                    outputAmount: Number(quote.outAmount),
                    txHash: 'DRY_RUN_NO_TX',
                };
            }

            // Ensure we have a wBTC token account
            await wallet.getOrCreateTokenAccount(new PublicKey(config.wbtcMintAddress));

            // Get swap transaction
            const swapResponse = await jupiter.swapPost({
                swapRequest: {
                    quoteResponse: quote,
                    userPublicKey: wallet.publicKey.toBase58(),
                    wrapAndUnwrapSol: true,
                    dynamicComputeUnitLimit: true,
                    dynamicSlippage: true,
                },
            });

            if (!swapResponse.swapTransaction) {
                throw new Error('No swap transaction returned from Jupiter');
            }

            // Deserialize and sign
            const txBuffer = Buffer.from(swapResponse.swapTransaction, 'base64');
            const tx = VersionedTransaction.deserialize(txBuffer);

            // Execute
            log.info('Executing swap transaction...');
            const signature = await wallet.signAndSendTransaction(tx);

            // Verify output received
            const finalBalance = await wallet.getTokenBalance(
                new PublicKey(config.wbtcMintAddress)
            );

            log.info({
                signature,
                inputSol: solAmount,
                outputBtc: quote.outAmount,
                finalBalance,
            }, 'Swap completed successfully');

            return {
                success: true,
                inputAmount: solAmount,
                outputAmount: Number(quote.outAmount),
                txHash: signature,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error({ error: errorMessage }, 'Swap failed');

            return {
                success: false,
                inputAmount: solAmount,
                outputAmount: 0,
                error: errorMessage,
            };
        }
    }

    return {
        getQuote,
        executeSwap,
    };
}
