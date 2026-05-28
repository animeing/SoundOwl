const fs = require('node:fs/promises');

/**
 * MariaDB dump SQLを実行単位に分割する。
 *
 * `DELIMITER //`を使うTRIGGER/PROCEDURE/EVENTを壊さず、1 statementずつDBに渡せる配列へ変換する。
 *
 * @param {string} sql MariaDB dump SQL文字列。
 * @returns {string[]} 実行順を保ったSQL statement配列。
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
 * 既存PHPと同じschema SQLを使ってDBとテーブル/VIEW/TRIGGER/EVENTを作成する。
 *
 * @param {{query(sql:string, params?:unknown[]): Promise<unknown>}} db mysql2 Pool/Connection互換のDBオブジェクト。
 * @param {{schemaPath:string, databaseName?:string}} options schema SQLファイルと作成対象DB名。
 * @returns {Promise<void>} 全SQLの実行が完了したらresolveする。SQLエラー時はrejectする。
 */
async function createSchema(db, { schemaPath, databaseName = 'sound' }) {
  const sql = await fs.readFile(schemaPath, 'utf8');
  await db.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  await db.query(`USE \`${databaseName}\``);
  for (const statement of splitMariaDbSql(sql)) {
    await db.query(statement);
  }
}

/**
 * statement候補を配列へ追加する内部処理。
 *
 * @param {string[]} statements 追加先配列。
 * @param {string} buffer statement候補文字列。
 * @returns {void}
 */
function flushBuffer(statements, buffer) {
  const statement = buffer.trim();
  if (isExecutableStatement(statement)) {
    statements.push(statement);
  }
}

/**
 * SQLとして実行すべきstatementか判定する。
 *
 * @param {string} statement 判定対象。
 * @returns {boolean} 空文字と通常コメント行はfalse、MariaDB実行コメントを含むSQLはtrue。
 */
function isExecutableStatement(statement) {
  if (!statement) {
    return false;
  }
  return !statement.startsWith('--');
}

module.exports = {
  createSchema,
  splitMariaDbSql,
};
