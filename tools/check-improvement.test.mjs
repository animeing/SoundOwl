import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validate, render } from './check-improvement.mjs';

const example = JSON.parse(readFileSync(new URL('../docs/improvement-decisions/481.json', import.meta.url)));
const copy = () => structuredClone(example);

test('未解決事項があっても検討候補のIssueにはできる', () => {
  const record = copy();
  record.decision = 'investigate';
  assert.deepEqual(validate(record, 'investigate'), []);
  assert.match(render(record, 'digest'), /要検討・採否未判断/);
});
test('検討済みの現状維持を要検討と表示しない', () => {
  assert.deepEqual(validate(example, 'investigate'), []);
  assert.match(render(example, 'digest'), /現状維持・変更見送り/);
  assert.doesNotMatch(render(example, 'digest'), /^# \[要検討/);
});
test('使う場合の比較を欠くと検討候補でも止まる', () => {
  const record = copy();
  delete record.scenarios.used;
  assert.ok(validate(record, 'investigate').some(v => v.includes('scenarios.used')));
});
test('各条件の不利益検討を一つずつ欠落させて検出する', () => {
  for (const key of Object.keys(example.scenarios)) {
    const record = copy();
    record.scenarios[key].tradeoff = '未検討';
    assert.ok(validate(record, 'investigate').some(v => v.includes(`scenarios.${key}.tradeoff`)));
  }
});
test('設計理由を調べた記録がなければ止まる', () => {
  const record = copy();
  record.existing.reason_checked = '';
  assert.ok(validate(record, 'investigate').some(v => v.includes('reason_checked')));
});
test('候補のまま推奨・実装に進めない', () => {
  const record = copy();
  record.decision = 'investigate';
  for (const action of ['recommend', 'implement']) {
    assert.ok(validate(record, action).some(v => v.includes('推奨・実装')));
  }
});
test('adoptへ書き換えただけでは通らない', () => {
  const record = copy();
  record.decision = 'adopt';
  const errors = validate(record, 'implement');
  assert.ok(errors.some(v => v.includes('比較結果')));
  assert.ok(errors.some(v => v.includes('未解決事項')));
});
test('性能改善の推奨は機能テストだけでは通らない', () => {
  const record = copy();
  Object.assign(record, { decision: 'adopt', unresolved: [], comparison_result: '比較結果を記載', performance_claim: true });
  assert.ok(validate(record, 'recommend').some(v => v.includes('実測')));
  record.evidence.push({ kind: 'measurement', reference: 'テスト用の測定参照', finding: '検証器のテスト用データ' });
  assert.deepEqual(validate(record, 'recommend'), []);
});
test('CLIも候補の実装を非ゼロ終了で拒否する', () => {
  const script = new URL('./check-improvement.mjs', import.meta.url);
  const file = new URL('../docs/improvement-decisions/481.json', import.meta.url);
  const result = spawnSync(process.execPath, [script.pathname, 'implement', file.pathname], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /推奨・実装へ進めない/);
});
