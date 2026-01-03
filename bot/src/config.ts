import { config as dotenvConfig } from 'dotenv';
import { PublicKey } from '@solana/web3.js';

dotenvConfig();

export interface Config {
    // Network
    rpcUrl: string;
    network: 'mainnet-beta' | 'devnet';

    // Wallets
    devWalletSecretKey: string;

    // Token addresses
    tokenMintAddress: string;      // Your Pump.fun token
    wbtcMintAddress: string;       // Wrapped BTC mint

    // Safety parameters
    minSolBalance: number;         // Safety floor in SOL
    swapThreshold: number;         // Min SOL to trigger swap
    slippageBps: number;           // Slippage in basis points
    minOutputBps: number;          // Min output as % of quote

    // Distribution parameters
    minHolderBalance: number;      // Min tokens to be eligible
    maxHolderBalance?: number;     // Anti-whale cap (optional)
    distributionWeighting: 'linear' | 'sqrt';

    // Scheduling
    distributionCron: string;      // Cron expression

    // Helius
    heliusApiKey: string;

    // Flags
    dryRun: boolean;
}

// Wrapped BTC (Wormhole) on Solana
const WBTC_MINT_MAINNET = '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh';
// For devnet testing, we'll use a mock or available token
const WBTC_MINT_DEVNET = 'So11111111111111111111111111111111111111112'; // SOL as placeholder

function getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

function validatePublicKey(key: string, value: string): void {
    try {
        new PublicKey(value);
    } catch {
        throw new Error(`Invalid public key for ${key}: ${value}`);
    }
}

export function loadConfig(): Config {
    const network = getEnvOrDefault('NETWORK', 'mainnet-beta') as 'mainnet-beta' | 'devnet';
    const isDevnet = network === 'devnet';

    const tokenMintAddress = getEnvOrThrow('TOKEN_MINT_ADDRESS');
    const wbtcMintAddress = getEnvOrDefault(
        'WBTC_MINT_ADDRESS',
        isDevnet ? WBTC_MINT_DEVNET : WBTC_MINT_MAINNET
    );

    // Validate public keys
    validatePublicKey('TOKEN_MINT_ADDRESS', tokenMintAddress);
    validatePublicKey('WBTC_MINT_ADDRESS', wbtcMintAddress);

    const config: Config = {
        network,
        rpcUrl: getEnvOrThrow('RPC_URL'),
        devWalletSecretKey: getEnvOrThrow('DEV_WALLET_SECRET_KEY'),
        tokenMintAddress,
        wbtcMintAddress,

        // Safety defaults
        minSolBalance: parseFloat(getEnvOrDefault('MIN_SOL_BALANCE', '0.05')),
        swapThreshold: parseFloat(getEnvOrDefault('SWAP_THRESHOLD', '0.1')),
        slippageBps: parseInt(getEnvOrDefault('SLIPPAGE_BPS', '100'), 10),
        minOutputBps: parseInt(getEnvOrDefault('MIN_OUTPUT_BPS', '9900'), 10), // 99% of quote

        // Distribution defaults
        minHolderBalance: parseFloat(getEnvOrDefault('MIN_HOLDER_BALANCE', '1000000')),
        maxHolderBalance: process.env.MAX_HOLDER_BALANCE
            ? parseFloat(process.env.MAX_HOLDER_BALANCE)
            : undefined,
        distributionWeighting: getEnvOrDefault('DISTRIBUTION_WEIGHTING', 'linear') as 'linear' | 'sqrt',

        // Schedule: every 15 minutes by default
        distributionCron: getEnvOrDefault('DISTRIBUTION_CRON', '*/15 * * * *'),

        // Helius
        heliusApiKey: getEnvOrThrow('HELIUS_API_KEY'),

        // Flags
        dryRun: process.env.DRY_RUN === 'true',
    };

    return config;
}

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const LAMPORTS_PER_SOL = 1_000_000_000;
