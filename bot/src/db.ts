import Database from 'better-sqlite3';
import path from 'path';
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
  // Swaps
  insertSwap(record: Omit<SwapRecord, 'id'>): number;
  updateSwap(id: number, btcAmount: number, txHash: string, status: SwapRecord['status'], error?: string): void;
  updateSwapStatus(id: number, status: SwapRecord['status'], error?: string): void;
  getRecentSwaps(limit?: number): SwapRecord[];
  getTotalSwapped(): { total_sol: number; total_btc: number };

  // Distributions
  insertDistribution(record: Omit<DistributionRecord, 'id'>): number;
  updateDistributionStatus(id: number, status: DistributionRecord['status'], error?: string): void;
  getDistributionById(distributionId: string): DistributionRecord | null;
  getRecentDistributions(limit?: number): DistributionRecord[];
  getTotalDistributed(): number;
  getLastDistribution(): DistributionRecord | null;

  // Transfers
  insertTransfer(record: Omit<TransferRecord, 'id'>): number;
  updateTransferStatus(id: number, status: TransferRecord['status'], txHash?: string, error?: string): void;
  getTransfersByDistribution(distributionId: string): TransferRecord[];
  getTransfersByHolder(holderAddress: string): TransferRecord[];
  getPendingTransfers(distributionId: string): TransferRecord[];

  // Utility
  close(): void;
}

export function createDatabaseManager(dbPath?: string): DatabaseManager {
  const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'btc500.db');

  // Ensure directory exists
  const dir = path.dirname(resolvedPath);
  import('fs').then(fs => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');

  log.info({ path: resolvedPath }, 'Database initialized');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS swaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      sol_amount REAL NOT NULL,
      btc_amount REAL NOT NULL,
      tx_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT
    );
    
    CREATE TABLE IF NOT EXISTS distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      distribution_id TEXT NOT NULL UNIQUE,
      timestamp TEXT NOT NULL,
      total_btc REAL NOT NULL,
      holder_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT
    );
    
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      distribution_id TEXT NOT NULL,
      holder_address TEXT NOT NULL,
      btc_amount REAL NOT NULL,
      tx_hash TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      FOREIGN KEY (distribution_id) REFERENCES distributions(distribution_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_transfers_distribution ON transfers(distribution_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_holder ON transfers(holder_address);
    CREATE INDEX IF NOT EXISTS idx_swaps_timestamp ON swaps(timestamp);
    CREATE INDEX IF NOT EXISTS idx_distributions_timestamp ON distributions(timestamp);
  `);

  // Prepared statements
  const insertSwapStmt = db.prepare(`
    INSERT INTO swaps (timestamp, sol_amount, btc_amount, tx_hash, status, error)
    VALUES (@timestamp, @sol_amount, @btc_amount, @tx_hash, @status, @error)
  `);

  const updateSwapStatusStmt = db.prepare(`
    UPDATE swaps SET status = ?, error = ? WHERE id = ?
  `);

  const insertDistributionStmt = db.prepare(`
    INSERT INTO distributions (distribution_id, timestamp, total_btc, holder_count, status, error)
    VALUES (@distribution_id, @timestamp, @total_btc, @holder_count, @status, @error)
  `);

  const updateDistributionStatusStmt = db.prepare(`
    UPDATE distributions SET status = ?, error = ? WHERE id = ?
  `);

  const insertTransferStmt = db.prepare(`
    INSERT INTO transfers (distribution_id, holder_address, btc_amount, tx_hash, status, error)
    VALUES (@distribution_id, @holder_address, @btc_amount, @tx_hash, @status, @error)
  `);

  const updateTransferStatusStmt = db.prepare(`
    UPDATE transfers SET status = ?, tx_hash = COALESCE(?, tx_hash), error = ? WHERE id = ?
  `);

  return {
    insertSwap(record) {
      const result = insertSwapStmt.run(record);
      return result.lastInsertRowid as number;
    },

    updateSwap(id, btcAmount, txHash, status, error) {
      db.prepare(`
        UPDATE swaps SET btc_amount = ?, tx_hash = ?, status = ?, error = ? WHERE id = ?
      `).run(btcAmount, txHash, status, error || null, id);
    },

    updateSwapStatus(id, status, error) {
      updateSwapStatusStmt.run(status, error || null, id);
    },

    getRecentSwaps(limit = 50) {
      return db.prepare(`
        SELECT * FROM swaps ORDER BY timestamp DESC LIMIT ?
      `).all(limit) as SwapRecord[];
    },

    getTotalSwapped() {
      const result = db.prepare(`
        SELECT COALESCE(SUM(sol_amount), 0) as total_sol, 
               COALESCE(SUM(btc_amount), 0) as total_btc 
        FROM swaps WHERE status = 'success'
      `).get() as { total_sol: number; total_btc: number };
      return result;
    },

    insertDistribution(record) {
      const result = insertDistributionStmt.run(record);
      return result.lastInsertRowid as number;
    },

    updateDistributionStatus(id, status, error) {
      updateDistributionStatusStmt.run(status, error || null, id);
    },

    getDistributionById(distributionId) {
      return db.prepare(`
        SELECT * FROM distributions WHERE distribution_id = ?
      `).get(distributionId) as DistributionRecord | null;
    },

    getRecentDistributions(limit = 50) {
      return db.prepare(`
        SELECT * FROM distributions ORDER BY timestamp DESC LIMIT ?
      `).all(limit) as DistributionRecord[];
    },

    getTotalDistributed() {
      const result = db.prepare(`
        SELECT COALESCE(SUM(total_btc), 0) as total 
        FROM distributions WHERE status = 'success'
      `).get() as { total: number };
      return result.total;
    },

    getLastDistribution() {
      return db.prepare(`
        SELECT * FROM distributions ORDER BY timestamp DESC LIMIT 1
      `).get() as DistributionRecord | null;
    },

    insertTransfer(record) {
      const result = insertTransferStmt.run(record);
      return result.lastInsertRowid as number;
    },

    updateTransferStatus(id, status, txHash, error) {
      updateTransferStatusStmt.run(status, txHash || null, error || null, id);
    },

    getTransfersByDistribution(distributionId) {
      return db.prepare(`
        SELECT * FROM transfers WHERE distribution_id = ?
      `).all(distributionId) as TransferRecord[];
    },

    getTransfersByHolder(holderAddress) {
      return db.prepare(`
        SELECT * FROM transfers WHERE holder_address = ? AND status = 'success'
        ORDER BY id DESC
      `).all(holderAddress) as TransferRecord[];
    },

    getPendingTransfers(distributionId) {
      return db.prepare(`
        SELECT * FROM transfers WHERE distribution_id = ? AND status = 'pending'
      `).all(distributionId) as TransferRecord[];
    },

    close() {
      db.close();
      log.info('Database connection closed');
    },
  };
}
