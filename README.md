# BTC500 - Bitcoin Rewards Distribution System

**Contract:** `FYVsj8WqTyL8HW79i1NrmyTyTt672K6NMDxPWJwFpump`

[Twitter](https://x.com/BTC500fun) | [Pump.fun](https://pump.fun/FYVsj8WqTyL8HW79i1NrmyTyTt672K6NMDxPWJwFpump) | [Solscan](https://solscan.io/token/FYVsj8WqTyL8HW79i1NrmyTyTt672K6NMDxPWJwFpump)

<p align="center">
  <img src="https://img.shields.io/badge/Solana-362D59?style=for-the-badge&logo=solana&logoColor=white" alt="Solana" />
  <img src="https://img.shields.io/badge/Bitcoin-F7931A?style=for-the-badge&logo=bitcoin&logoColor=white" alt="Bitcoin" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
</p>

A production-ready on-chain system that automatically converts Pump.fun creator reward fees (SOL) into wrapped Bitcoin and distributes to token holders.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Pump.fun Token                               │
│                         (Trading Activity)                              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Creator Fees (SOL)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Dev Fee Wallet                                 │
│                    (Accumulates SOL fees)                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Every 15 minutes
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Distribution Bot                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐ │
│  │ Check       │───▶│ Swap via    │───▶│ Distribute wBTC             │ │
│  │ Balance     │    │ Jupiter     │    │ to Holders                  │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ wBTC Transfers
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Token Holders                                   │
│                    (Receive proportional wBTC)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📦 Project Structure

```
BTC500/
├── bot/                    # Distribution bot
│   ├── src/
│   │   ├── config.ts      # Configuration management
│   │   ├── wallet.ts      # Wallet operations
│   │   ├── jupiter.ts     # Jupiter swap integration
│   │   ├── holders.ts     # Holder snapshot via Helius
│   │   ├── distribute.ts  # wBTC distribution logic
│   │   ├── db.ts          # SQLite persistence
│   │   ├── logger.ts      # Pino logging
│   │   └── index.ts       # Main entry point
│   ├── .env.example       # Environment template
│   └── package.json
│
├── web/                    # Dashboard website
│   ├── app/
│   │   ├── page.tsx       # Main dashboard
│   │   ├── layout.tsx     # Root layout
│   │   ├── providers.tsx  # Wallet providers
│   │   ├── globals.css    # Global styles
│   │   ├── components/    # React components
│   │   └── api/           # API routes
│   ├── .env.example       # Environment template
│   └── package.json
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- A Solana wallet with some SOL
- [Helius API key](https://helius.dev) (free tier available)

### 1. Clone & Install

```bash
git clone <your-repo>
cd BTC500

# Install bot dependencies
cd bot && npm install

# Install website dependencies
cd ../web && npm install
```

### 2. Configure Environment

**Bot Configuration (`bot/.env`):**

```bash
cp bot/.env.example bot/.env
```

Edit with your values:

| Variable | Description |
|----------|-------------|
| `RPC_URL` | Helius RPC URL with API key |
| `HELIUS_API_KEY` | Your Helius API key |
| `DEV_WALLET_SECRET_KEY` | Base58 private key of dev wallet |
| `TOKEN_MINT_ADDRESS` | Your Pump.fun token mint |

**Website Configuration (`web/.env.local`):**

```bash
cp web/.env.example web/.env.local
```

### 3. Run the Bot

```bash
cd bot

# Development (with auto-reload)
npm run dev

# Production
npm run build && npm start

# Single execution (for testing)
npm run distribute:dry-run
```

### 4. Run the Website

```bash
cd web

# Development
npm run dev

# View at http://localhost:3000
```

## 💰 Reward Distribution Math

### Eligibility

Holders must meet these criteria:
- Token balance ≥ `MIN_HOLDER_BALANCE` (default: 0)
- Optional: balance capped at `MAX_HOLDER_BALANCE` for anti-whale

### Distribution Formula

**Linear weighting (default):**
```
holder_share = holder_balance / total_eligible_balance
holder_btc = total_btc * holder_share
```

**Square root weighting:**
```
holder_share = sqrt(holder_balance) / sum(sqrt(all_balances))
holder_btc = total_btc * holder_share
```

### Example

| Holder | Balance | Linear Share | Sqrt Share |
|--------|---------|--------------|------------|
| A | 100,000 | 50% | 41.4% |
| B | 60,000 | 30% | 32.1% |
| C | 40,000 | 20% | 26.5% |

## 🔒 Security

### Safety Features

- **Safety Floor**: Always keeps ≥0.5 SOL for transaction fees
- **Slippage Protection**: Jupiter swap with configurable slippage (default: 1%)
- **Minimum Output**: Fails if output < 99% of quoted amount
- **Retry Logic**: Exponential backoff for failed transfers
- **Idempotent**: Safe to restart mid-distribution

### Best Practices

1. **Never commit `.env` files** - secrets are only loaded at runtime
2. **Use a dedicated wallet** - don't use your main wallet
3. **Test on devnet first** - set `NETWORK=devnet`
4. **Monitor the logs** - all transactions are logged with tx hashes

## 🔍 Verification

### On-Chain Verification

All operations are fully verifiable on Solana:

1. **Swap Transactions**: View on [Solscan](https://solscan.io)
   - Input: SOL from dev wallet
   - Output: wBTC (mint: `3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh`)

2. **Distribution Transactions**: View on [Solscan](https://solscan.io)
   - Source: Dev wallet wBTC account
   - Destinations: Holder wBTC accounts

3. **Token Holders**: Query via Helius API
   - Use `getTokenAccounts` with your token mint

### Database Logs

The bot maintains a local SQLite database (`bot/data/btc500.db`) with:

- `swaps`: All SOL → wBTC swaps with amounts and tx hashes
- `distributions`: Each distribution cycle
- `transfers`: Individual holder transfers

## 🛠️ Configuration Reference

### Bot Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NETWORK` | No | `mainnet-beta` | `mainnet-beta` or `devnet` |
| `RPC_URL` | Yes | - | Helius RPC endpoint |
| `HELIUS_API_KEY` | Yes | - | Helius API key for holder queries |
| `DEV_WALLET_SECRET_KEY` | Yes | - | Base58 private key |
| `TOKEN_MINT_ADDRESS` | Yes | - | Your token mint |
| `WBTC_MINT_ADDRESS` | No | Wormhole wBTC | wBTC mint address |
| `MIN_SOL_BALANCE` | No | `0.5` | Safety floor (SOL) |
| `SWAP_THRESHOLD` | No | `0.1` | Min SOL to trigger swap |
| `SLIPPAGE_BPS` | No | `100` | Slippage (100 = 1%) |
| `MIN_HOLDER_BALANCE` | No | `0` | Min tokens for eligibility |
| `MAX_HOLDER_BALANCE` | No | - | Anti-whale cap |
| `DISTRIBUTION_WEIGHTING` | No | `linear` | `linear` or `sqrt` |
| `DISTRIBUTION_CRON` | No | `*/15 * * * *` | Cron schedule |
| `DRY_RUN` | No | `false` | Skip actual transactions |

## 📊 Scaling

The system handles thousands of holders efficiently:

- **Batched Transfers**: 5 transfers per transaction
- **Paginated Holder Queries**: 1000 per page via Helius
- **Rate Limiting**: Built-in delays to avoid RPC limits
- **Parallel Retry**: Failed batches are retried independently

For 10,000 holders:
- ~2,000 transfer transactions
- ~10 holder query pages
- Estimated cycle time: ~5-10 minutes

## 🐛 Troubleshooting

### Common Issues

**"Insufficient SOL for swap"**
- Increase `SWAP_THRESHOLD` or accumulate more fees

**"No quote available"**
- Jupiter may not have liquidity; try increasing slippage

**"Failed to fetch token accounts"**
- Check Helius API key and rate limits

**"Transaction simulation failed"**
- Check wallet has enough SOL for fees
- Verify token account exists

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ₿ for the Solana community
</p>
