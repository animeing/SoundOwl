import crypto from 'node:crypto';
import { queryRows } from './repositories/common.js';

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS registration_failures (
  step TINYINT UNSIGNED NOT NULL,
  target_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target TEXT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (step, target_hash),
  KEY registration_failures_updated (updated_at)
)`;

/** Safe failure reported when the history cannot be written or read. */
class FailureHistoryUnavailableError extends Error {
  constructor(cause) {
    super('Could not access registration failure history.', { cause });
    this.code = 'FAILURE_HISTORY_UNAVAILABLE';
    this.status = 503;
  }
}

/** Persist unresolved registration failures in the existing MariaDB database. */
class RegistrationFailureStore {
  /** @param {{query:(sql:string,params?:unknown[])=>Promise<unknown>}} db mysql2 pool. */
  constructor(db) {
    this.db = db;
    this.tableReady = null;
  }

  /** Create only the new table; never run the destructive setup schema during an upgrade. */
  async ensureTable() {
    if (!this.tableReady) {
      this.tableReady = this.db.query(CREATE_TABLE).catch((error) => {
        this.tableReady = null;
        throw error;
      });
    }
    await this.tableReady;
  }

  /** Keep database details in server logs rather than public API error responses. */
  async withTable(operation) {
    try {
      await this.ensureTable();
      return await operation();
    } catch (error) {
      throw new FailureHistoryUnavailableError(error);
    }
  }

  /** @param {1|2} step Registration step. @param {string} target Absolute audio path. @param {string} reason Safe public reason. */
  async record(step, target, reason) {
    return this.withTable(() => this.db.query(`INSERT INTO registration_failures (step, target_hash, target, reason)
      VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE target = VALUES(target), reason = VALUES(reason), updated_at = CURRENT_TIMESTAMP(3)`,
    [step, hashTarget(target), target, reason]));
  }

  /** Remove a failure only after that same file completes that same step. */
  async resolve(step, target) {
    return this.withTable(() => this.db.query('DELETE FROM registration_failures WHERE step = ? AND target_hash = ?', [step, hashTarget(target)]));
  }

  /** Clear stale failure rows after the user resets the music database. */
  async clearAll() {
    return this.withTable(() => this.db.query('DELETE FROM registration_failures'));
  }

  /** Return counts and a bounded page of unresolved failures. */
  async list({ step = null, limit = 25, offset = 0 } = {}) {
    return this.withTable(async () => {
      const counts = await queryRows(this.db, 'SELECT step, COUNT(*) AS total FROM registration_failures GROUP BY step');
      const countByStep = { step1: 0, step2: 0 };
      for (const row of counts) {
        countByStep[`step${row.step}`] = Number(row.total);
      }
      const where = step ? 'WHERE step = ?' : '';
      const filter = step ? [step] : [];
      const rows = limit > 0 ? await queryRows(this.db,
        `SELECT step, target, reason, updated_at AS updatedAt FROM registration_failures ${where} ORDER BY updated_at DESC, target_hash ASC LIMIT ? OFFSET ?`,
        [...filter, limit, offset]) : [];
      return {
        counts: countByStep,
        total: step ? countByStep[`step${step}`] : countByStep.step1 + countByStep.step2,
        failures: rows.map((row) => ({
          step: Number(row.step),
          target: row.target,
          reason: row.reason,
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
        })),
        limit,
        offset,
      };
    });
  }
}

/** Hash the complete path so arbitrarily long paths can be used as one indexed key. */
function hashTarget(target) {
  return crypto.createHash('sha256').update(target).digest('hex');
}

export { FailureHistoryUnavailableError, RegistrationFailureStore };
