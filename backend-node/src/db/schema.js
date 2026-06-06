import fs from 'node:fs/promises';

/**
 * MariaDB の SQL ファイルを実行可能な文単位へ分割します。
 * DELIMITER ブロックを扱い、コメント行と空文は除外します。
 * @param {string} sql SQL ファイル全体の文字列。
 * @returns {string[]} 実行順に並んだ SQL 文一覧。
 */
function splitMariaDbSql(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const rawLine of sql.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('--')) {
      continue;
    }
    if (/^DELIMITER\s+/i.test(line)) {
      flushBuffer(statements, buffer);
      buffer = '';
      delimiter = line.replace(/^DELIMITER\s+/i, '');
      continue;
    }

    buffer += `${rawLine}\n`;
    if (buffer.trimEnd().endsWith(delimiter)) {
      const statement = buffer.trimEnd().slice(0, -delimiter.length).trim();
      if (isExecutableStatement(statement)) {
        statements.push(statement);
      }
      buffer = '';
    }
  }

  flushBuffer(statements, buffer);
  return statements;
}

/**
 * DB を作成して schema SQL を順番に実行します。
 * @param {{query:(sql:string)=>Promise<any>}} db mysql2 互換の query 関数を持つ DB クライアント。
 * @param {{schemaPath:string,databaseName?:string}} options schema ファイルパスと作成対象 DB 名。
 * @returns {Promise<void>} schema 作成完了後に解決します。
 */
async function createSchema(db, { schemaPath, databaseName = 'sound' }) {
  const sql = await fs.readFile(schemaPath, 'utf8');
  await db.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
  await db.query(`USE \`${databaseName}\``);
  for (const statement of splitMariaDbSql(sql)) {
    await db.query(statement);
  }
}

/**
 * バッファに残っている SQL 文を実行対象一覧へ追加します。
 * @param {string[]} statements 追加先の SQL 文一覧。
 * @param {string} buffer 現在読み込み中の SQL 断片。
 * @returns {void} 実行可能な文がある場合だけ statements を更新します。
 */
function flushBuffer(statements, buffer) {
  const statement = buffer.trim();
  if (isExecutableStatement(statement)) {
    statements.push(statement);
  }
}

/**
 * 空文字や SQL コメントだけの行を実行対象から除外します。
 * @param {string} statement 判定する SQL 文。
 * @returns {boolean} DB に投げるべき SQL 文の場合は true。
 */
function isExecutableStatement(statement) {
  if (!statement) {
    return false;
  }
  return !statement.startsWith('--');
}

export {
  createSchema,
  splitMariaDbSql,
};
