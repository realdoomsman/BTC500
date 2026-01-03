import { createClient, Client } from '@libsql/client';
import { createChildLogger } from './logger.js';

const log = createChildLogger('db');

export interface SwapRecord {
  id?: number;
  timestamp: string;
  sol_amount: number;
  btc_amount: number;
  tx_hash: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

export interface DistributionRecord {
  id?: number;
  distribution_id: string;
  timestamp: string;
  total_btc: number;
  holder_count: number;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  error?: string;
}

export interface TransferRecord {
  id?: number;
  distribution_id: string;
  holder_address: string;
  btc_amount: number;
  tx_hash?: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

export interface DatabaseManager {
  insertSwap(record: Omit<SwapRecord, 'id'>): Promise<number>;
  updateSwap(id: number, btcAmount: number, txHash: string, status: SwapRecord['status'], error?: string): Promise<void>;
  updateSwapStatus(id: number, status: SwapRecord['status'], error?: string): Promise<void>;
  getRecentSwaps(limit?: number): Promise<SwapRecord[]>;
  getTotalSwapped(): Promise<{ total_sol: number; total_btc: number }>;

  insertDistribution(record: Omit<DistributionRecord, 'id'>): Promise<number>;
  updateDistributionStatus(id: number, status: DistributionRecord['status'], error?: string): Promise<void>;
  getDistributionById(distributionId: string): Promise<DistributionRecord | null>;
  getRecentDistributions(limit?: number): Promise<DistributionRecord[]>;
  getTotalDistributed(): Promise<number>;
  getLastDistribution(): Promise<DistributionRecord | null>;

  insertTransfer(record: Omit<TransferRecord, 'id'>): Promise<number>;
  updateTransferStatus(id: number, status: TransferRecord['status'], txHash?: string, error?: string): Promise<void>;
  getTransfersByDistribution(distributionId: string): Promise<TransferRecord[]>;
  getTransfersByHolder(holderAddress: string): Promise<TransferRecord[]>;
  getPendingTransfers(distributionId: string): Promise<TransferRecord[]>;

  close(): void;
}

export function createDatabaseManager(): DatabaseManager {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  }

  const client = createClient({ url, authToken });

  log.info('Connected to Turso cloud database');

  // Initialize tables
  (async () => {
    await client.execute(`
            CREATE TABLE IF NOT EXISTS swaps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                sol_amount REAL NOT NULL,
                btc_amount REAL NOT NULL,
                tx_hash TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT
            )
        `);

    await client.execute(`
            CREATE TABLE IF NOT EXISTS distributions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                distribution_id TEXT NOT NULL UNIQUE,
                timestamp TEXT NOT NULL,
                total_btc REAL NOT NULL,
                holder_count INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT
            )
        `);

    await client.execute(`
            CREATE TABLE IF NOT EXISTS transfers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                distribution_id TEXT NOT NULL,
                holder_address TEXT NOT NULL,
                btc_amount REAL NOT NULL,
                tx_hash TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT
            )
        `);

    log.info('Database tables initialized');
  })();

  return {
    async insertSwap(record) {
      const result = await client.execute({
        sql: `INSERT INTO swaps (timestamp, sol_amount, btc_amount, tx_hash, status, error)
                      VALUES (?, ?, ?, ?, ?, ?)`,
        args: [record.timestamp, record.sol_amount, record.btc_amount, record.tx_hash, record.status, record.error || null]
      });
      return Number(result.lastInsertRowid);
    },

    async updateSwap(id, btcAmount, txHash, status, error) {
      await client.execute({
        sql: `UPDATE swaps SET btc_amount = ?, tx_hash = ?, status = ?, error = ? WHERE id = ?`,
        args: [btcAmount, txHash, status, error || null, id]
      });
    },

    async updateSwapStatus(id, status, error) {
      await client.execute({
        sql: `UPDATE swaps SET status = ?, error = ? WHERE id = ?`,
        args: [status, error || null, id]
      });
    },

    async getRecentSwaps(limit = 50) {
      const result = await client.execute({
        sql: `SELECT * FROM swaps ORDER BY timestamp DESC LIMIT ?`,
        args: [limit]
      });
      return result.rows as unknown as SwapRecord[];
    },

    async getTotalSwapped() {
      const result = await client.execute(
        `SELECT COALESCE(SUM(sol_amount), 0) as total_sol, COALESCE(SUM(btc_amount), 0) as total_btc FROM swaps WHERE status = 'success'`
      );
      const row = result.rows[0];
      return { total_sol: Number(row.total_sol), total_btc: Number(row.total_btc) };
    },

    async insertDistribution(record) {
      const result = await client.execute({
        sql: `INSERT INTO distributions (distribution_id, timestamp, total_btc, holder_count, status, error)
                      VALUES (?, ?, ?, ?, ?, ?)`,
        args: [record.distribution_id, record.timestamp, record.total_btc, record.holder_count, record.status, record.error || null]
      });
      return Number(result.lastInsertRowid);
    },

    async updateDistributionStatus(id, status, error) {
      await client.execute({
        sql: `UPDATE distributions SET status = ?, error = ? WHERE id = ?`,
        args: [status, error || null, id]
      });
    },

    async getDistributionById(distributionId) {
      const result = await client.execute({
        sql: `SELECT * FROM distributions WHERE distribution_id = ?`,
        args: [distributionId]
      });
      return result.rows[0] as unknown as DistributionRecord || null;
    },

    async getRecentDistributions(limit = 50) {
      const result = await client.execute({
        sql: `SELECT * FROM distributions ORDER BY timestamp DESC LIMIT ?`,
        args: [limit]
      });
      return result.rows as unknown as DistributionRecord[];
    },

    async getTotalDistributed() {
      const result = await client.execute(
        `SELECT COALESCE(SUM(total_btc), 0) as total FROM distributions WHERE status = 'success'`
      );
      return Number(result.rows[0].total);
    },

    async getLastDistribution() {
      const result = await client.execute(
        `SELECT * FROM distributions ORDER BY timestamp DESC LIMIT 1`
      );
      return result.rows[0] as unknown as DistributionRecord || null;
    },

    async insertTransfer(record) {
      const result = await client.execute({
        sql: `INSERT INTO transfers (distribution_id, holder_address, btc_amount, tx_hash, status, error)
                      VALUES (?, ?, ?, ?, ?, ?)`,
        args: [record.distribution_id, record.holder_address, record.btc_amount, record.tx_hash || null, record.status, record.error || null]
      });
      return Number(result.lastInsertRowid);
    },

    async updateTransferStatus(id, status, txHash, error) {
      await client.execute({
        sql: `UPDATE transfers SET status = ?, tx_hash = COALESCE(?, tx_hash), error = ? WHERE id = ?`,
        args: [status, txHash || null, error || null, id]
      });
    },

    async getTransfersByDistribution(distributionId) {
      const result = await client.execute({
        sql: `SELECT * FROM transfers WHERE distribution_id = ?`,
        args: [distributionId]
      });
      return result.rows as unknown as TransferRecord[];
    },

    async getTransfersByHolder(holderAddress) {
      const result = await client.execute({
        sql: `SELECT * FROM transfers WHERE holder_address = ? AND status = 'success' ORDER BY id DESC`,
        args: [holderAddress]
      });
      return result.rows as unknown as TransferRecord[];
    },

    async getPendingTransfers(distributionId) {
      const result = await client.execute({
        sql: `SELECT * FROM transfers WHERE distribution_id = ? AND status = 'pending'`,
        args: [distributionId]
      });
      return result.rows as unknown as TransferRecord[];
    },

    close() {
      client.close();
      log.info('Database connection closed');
    },
  };
}
