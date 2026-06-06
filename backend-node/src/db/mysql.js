import mysql from 'mysql2/promise';

/**
 * @typedef {Object} MysqlConfig
 * @property {string} host MariaDB ホスト名。
 * @property {string} user MariaDB ユーザー名。
 * @property {string} password MariaDB パスワード。
 * @property {string} database 接続先データベース名。
 * @property {{attempts?:number,delayMs?:number}} [retry] 起動直後の DB 待ちに使うリトライ設定。
 */

/**
 * mysql2 の connection pool を作成し、接続確認に成功するまでリトライします。
 * @param {MysqlConfig} config DB 接続情報とリトライ設定。
 * @returns {Promise<import('mysql2/promise').Pool>} 接続確認済みの mysql2 connection pool。
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
 * DB 起動待ちのため、pool から connection を取得できるまで指定回数リトライします。
 * @param {{getConnection:()=>Promise<{release:()=>void}>}} pool mysql2 Pool または同じ getConnection/release 契約を持つテスト用 fake。
 * @param {{attempts?:number,delayMs?:number}} [retry={}] 最大試行回数と試行間隔。
 * @returns {Promise<void>} 接続確認に成功した場合は値を返しません。
 * @throws {Error} 指定回数すべて失敗した場合、最後に発生した接続エラーを投げます。
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
 * 指定時間だけ非同期処理を待機させます。
 * @param {number} ms 待機するミリ秒。
 * @returns {Promise<void>} 待機完了後に解決する Promise。
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { createMysqlPool, sleep, waitForMysql };
