import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSchema, splitMariaDbSql } from '../src/db/schema.js';

test('splitMariaDbSql handles semicolon statements and custom delimiter blocks', () => {
  const statements = splitMariaDbSql(`
-- ignored
CREATE TABLE one (id int);
DELIMITER //
CREATE TRIGGER trg BEFORE DELETE ON one
FOR EACH ROW
BEGIN
  SELECT 1;
END //
DELIMITER ;
/*!50001 CREATE VIEW v AS SELECT * FROM one */;
`);
  assert.equal(statements.length, 3);
  assert.match(statements[1], /CREATE TRIGGER/);
  assert.match(statements[2], /CREATE VIEW/);
});

test('createSchema creates database, uses it, and executes parsed statements in order', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-schema-'));
  const schemaPath = path.join(dir, 'schema.sql');
  await fs.writeFile(schemaPath, 'CREATE TABLE t (id int);');
  const calls = [];
  const db = { query: async (sql) => calls.push(sql) };

  await createSchema(db, { schemaPath, databaseName: 'sound' });

  assert.deepEqual(calls, [
    'CREATE DATABASE IF NOT EXISTS `sound` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci',
    'USE `sound`',
    'CREATE TABLE t (id int)',
  ]);
});

