const DAYS_AHEAD = 7;
const LOCK_NAME = 'soundowl:play-history-partitions';

function addDays(date, count) {
  const day = new Date(date + 'T00:00:00.000Z');
  day.setUTCDate(day.getUTCDate() + count);
  return day.toISOString().slice(0, 10);
}

async function partitionCoverageEnd(connection) {
  const [[partition]] = await connection.query(
    "SELECT PARTITION_NAME AS name, PARTITION_DESCRIPTION AS boundary, " +
    "DATE_FORMAT(FROM_DAYS(PARTITION_DESCRIPTION), '%Y-%m-%d') AS coverageEnd " +
    "FROM information_schema.PARTITIONS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sound_play_history' " +
    "ORDER BY PARTITION_ORDINAL_POSITION DESC LIMIT 1",
  );
  if (!partition?.name) {
    throw new Error('sound_play_history is missing or is not partitioned.');
  }
  return partition.boundary === 'MAXVALUE' ? '9999-12-31' : partition.coverageEnd;
}

/**
 * Restore missing daily history partitions without recreating tables or rewriting history.
 * A separate connection lock prevents concurrent backend startups from adding the same partition.
 * @param {import('mysql2/promise').Pool} pool Live MariaDB pool.
 */
async function ensurePlayHistoryPartitions(pool) {
  const connection = await pool.getConnection();
  let locked = false;
  try {
    const [[clock]] = await connection.query("SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS today");
    const [[lock]] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [LOCK_NAME]);
    if (Number(lock.acquired) !== 1) {
      throw new Error('Could not lock play history partition maintenance.');
    }
    locked = true;
    // The old event truncates and rebuilds the history table. Retire it before maintenance.
    await connection.query('DROP EVENT IF EXISTS manage_partitions_event');
    let coverageEnd = await partitionCoverageEnd(connection);
    for (let offset = 0; offset <= DAYS_AHEAD; offset += 1) {
      const date = addDays(clock.today, offset);
      if (coverageEnd > date) continue;
      const nextDate = addDays(date, 1);
      const name = 'p' + date.replaceAll('-', '');
      try {
        await connection.query(
          "ALTER TABLE sound_play_history ADD PARTITION " +
          "(PARTITION " + name + " VALUES LESS THAN (TO_DAYS('" + nextDate + "')))",
        );
      } catch (error) {
        // Another backend process can add the same partition between the check and ALTER.
        const refreshedEnd = await partitionCoverageEnd(connection);
        if (refreshedEnd <= date) throw error;
      }
      coverageEnd = await partitionCoverageEnd(connection);
    }
  } finally {
    try {
      if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
    } finally {
      connection.release();
    }
  }
}

export { ensurePlayHistoryPartitions };
