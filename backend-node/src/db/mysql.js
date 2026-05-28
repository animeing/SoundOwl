/**
 * mysql2/promiseのコネクションプールを作成する。
 *
 * @param {{host:string,user:string,password:string,database:string,retry?:{attempts?:number,delayMs?:number}}} config MariaDB接続設定。
 * @returns {Promise<import('mysql2/promise').Pool>} query/execute可能なmysql2 Pool。
 */
async function createMysqlPool(config) {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });
  await waitForMysql(pool, config.retry);
  return pool;
}

/**
 * Docker起動直後などDBがまだ受け付けない場合に備えてpingをretryする。
 *
 * @param {import('mysql2/promise').Pool} pool mysql2 Pool。
 * @param {{attempts?:number,delayMs?:number}} [retry] retry設定。
 * @returns {Promise<void>} ping成功時にresolveする。
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
 * 指定ms待機する。
 *
 * @param {number} ms 待機ms。
 * @returns {Promise<void>} 待機完了時にresolveする。
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { createMysqlPool, sleep, waitForMysql };
