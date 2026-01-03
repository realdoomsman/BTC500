import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL,
    VersionedTransaction,
    TransactionMessage,
    TransactionInstruction
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    getAccount,
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import bs58 from 'bs58';
import { Config } from './config.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('wallet');

export interface WalletManager {
    connection: Connection;
    keypair: Keypair;
    publicKey: PublicKey;
    getBalance(): Promise<number>;
    getDistributableSol(): Promise<number>;
    getTokenBalance(mint: PublicKey): Promise<number>;
    getOrCreateTokenAccount(mint: PublicKey): Promise<PublicKey>;
    signAndSendTransaction(tx: VersionedTransaction): Promise<string>;
}

export function createWalletManager(config: Config): WalletManager {
    const connection = new Connection(config.rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
    });

    // Decode secret key from base58
    let secretKey: Uint8Array;
    try {
        secretKey = bs58.decode(config.devWalletSecretKey);
    } catch {
        // Try parsing as JSON array (alternative format)
        try {
            secretKey = Uint8Array.from(JSON.parse(config.devWalletSecretKey));
        } catch {
            throw new Error('Invalid DEV_WALLET_SECRET_KEY format. Use base58 or JSON array.');
        }
    }

    const keypair = Keypair.fromSecretKey(secretKey);

    log.info({ publicKey: keypair.publicKey.toBase58() }, 'Wallet initialized');

    async function getBalance(): Promise<number> {
        const balance = await connection.getBalance(keypair.publicKey);
        return balance / LAMPORTS_PER_SOL;
    }

    async function getDistributableSol(): Promise<number> {
        const balance = await getBalance();
        const distributable = balance - config.minSolBalance;
        return Math.max(0, distributable);
    }

    async function getTokenBalance(mint: PublicKey): Promise<number> {
        try {
            const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);
            const account = await getAccount(connection, ata);
            return Number(account.amount);
        } catch (error: unknown) {
            // Account doesn't exist
            if (error instanceof Error && error.message.includes('could not find')) {
                return 0;
            }
            throw error;
        }
    }

    async function getOrCreateTokenAccount(mint: PublicKey): Promise<PublicKey> {
        const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);

        try {
            await getAccount(connection, ata);
            return ata;
        } catch {
            // Create the account
            log.info({ mint: mint.toBase58() }, 'Creating associated token account');

            const instruction = createAssociatedTokenAccountInstruction(
                keypair.publicKey,
                ata,
                keypair.publicKey,
                mint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

            const message = new TransactionMessage({
                payerKey: keypair.publicKey,
                recentBlockhash: blockhash,
                instructions: [instruction],
            }).compileToV0Message();

            const tx = new VersionedTransaction(message);
            tx.sign([keypair]);

            const signature = await connection.sendTransaction(tx);
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            });

            log.info({ signature, ata: ata.toBase58() }, 'Token account created');
            return ata;
        }
    }

    async function signAndSendTransaction(tx: VersionedTransaction): Promise<string> {
        tx.sign([keypair]);

        const signature = await connection.sendTransaction(tx, {
            maxRetries: 3,
            skipPreflight: false,
        });

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        });

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        return signature;
    }

    return {
        connection,
        keypair,
        publicKey: keypair.publicKey,
        getBalance,
        getDistributableSol,
        getTokenBalance,
        getOrCreateTokenAccount,
        signAndSendTransaction,
    };
}
