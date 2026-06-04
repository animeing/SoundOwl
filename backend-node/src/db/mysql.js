import mysql from 'mysql2/promise';

/**
 * mysql2/promise のコネクションプールを作成する。
 * Docker 起動直後など DB がまだ接続を受け付けない場合に備え、作成後に ping 相当の retry を行う。
 *
 * @param {{host:string,user:string,password:string,database:string,retry?:{attempts?:number,delayMs?:number}}} config MariaDB 接続設定。
 * @returns {Promise<import('mysql2/promise').Pool>} query/execute 可能な mysql2 Pool。
 */
async function createMysqlPool(config) {
  const pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    charset: 'utf8mb4',
  });
  await waitForMysql(pool, config.retry);
  return pool;
}

/**
 * Docker 起動直後など DB がまだ受け付けない場合に備えて接続確認を retry する。
 *
 * @param {import('mysql2/promise').Pool} pool mysql2 Pool。
 * @param {{attempts?:number,delayMs?:number}} [retry] retry 設定。
 * @returns {Promise<void>} 接続確認に成功した時点で resolve する。
 */
async function waitForMysql(pool, retry = {}) {
  const attempts = Number(retry.attempts || 30);
  const delayMs = Number(retry.delayMs || 1000);
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const connection = await pool.getConnection();
      connection.release();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * 指定ミリ秒だけ待機する。
 *
 * @param {number} ms 待機時間のミリ秒。
 * @returns {Promise<void>} 待機完了時に resolve する。
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { createMysqlPool, sleep, waitForMysql };
