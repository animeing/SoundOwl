#!/usr/bin/env node
// 検討の抜けと採否の混同を検出する。記述の真偽・判断の妥当性は保証しない。
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const requiredText = [
  'title', 'baseline', 'concern', 'existing.behavior', 'existing.reason_checked',
  'existing.intent', 'keep_current', 'costs', 'rationale', 'next_check',
  ...['used', 'unused', 'first', 'reuse', 'failure', 'concurrent'].flatMap(
    key => [`scenarios.${key}.current`, `scenarios.${key}.proposed`, `scenarios.${key}.tradeoff`]),
];
const get = (value, path) => path.split('.').reduce((v, key) => v?.[key], value);
const text = value => typeof value === 'string' && value.trim().length > 0
  && !/^(?:TODO|TBD|N\/A|未記入|未検討|なし|不明|-)$/i.test(value.trim());

export function validate(record, action) {
  const errors = [];
  if (!['investigate', 'recommend', 'implement'].includes(action)) errors.push('actionが不正');
  for (const key of requiredText) if (!text(get(record, key))) errors.push(`${key}: 検討内容が必要`);
  if (!['investigate', 'adopt', 'retain'].includes(record?.decision)) errors.push('decisionが不正');
  if (!Array.isArray(record?.evidence) || !record.evidence.length) errors.push('evidenceが必要');
  else for (const [i, item] of record.evidence.entries()) {
    if (!['code', 'measurement', 'history', 'test'].includes(item?.kind)
      || !text(item?.reference) || !text(item?.finding)) errors.push(`evidence[${i}]が不正`);
  }
  if (!Array.isArray(record?.unresolved) || record.unresolved.some(v => !text(v))) {
    errors.push('unresolvedは未解決事項の文字列配列が必要');
  }
  if (record?.decision === 'adopt') {
    if (!text(record.comparison_result)) errors.push('adoptには現状との比較結果が必要');
    if (record.unresolved?.length) errors.push('未解決事項があるためadopt不可');
    if (record.performance_claim === true && !record.evidence?.some(v => v.kind === 'measurement')) {
      errors.push('性能改善の採用判断には実測根拠が必要');
    }
  }
  if (typeof record?.performance_claim !== 'boolean') errors.push('performance_claimは真偽値が必要');
  if (action !== 'investigate' && record?.decision !== 'adopt') {
    errors.push('採用判断のない記録では推奨・実装へ進めない');
  }
  return errors;
}

export function render(record, digest) {
  const lines = [
    `# [${{ investigate: '要検討・採否未判断', adopt: '採用提案', retain: '現状維持・変更見送り' }[record.decision]}] ${record.title}`,
    '', `対象: ${record.baseline}`, '', '## 検討する理由', record.concern,
    '', '## 現状と設計理由の確認', record.existing.behavior,
    record.existing.reason_checked, record.existing.intent,
    '', '## 現状維持の利点', record.keep_current, '', '## 条件別の比較',
  ];
  const labels = { used: '機能を使う', unused: '機能を使わない', first: '初回', reuse: '再利用', failure: '失敗', concurrent: '並行要求' };
  for (const [key, label] of Object.entries(labels)) {
    const item = record.scenarios[key];
    lines.push(`### ${label}`, `現状: ${item.current}`, '', `変更案: ${item.proposed}`, '', `利益・不利益: ${item.tradeoff}`, '');
  }
  lines.push('## 増える負担', record.costs, '', '## 採否', record.rationale);
  if (record.comparison_result) lines.push(record.comparison_result);
  lines.push('', '## 未解決事項', ...record.unresolved.map(v => `- ${v}`), '', '## 次の確認', record.next_check,
    '', '## 根拠', ...record.evidence.map(v => `- [${v.kind}] ${v.reference}: ${v.finding}`),
    '', `検討記録 SHA-256: ${digest}`, '', 'Created by chatgpt 6.1', '');
  return lines.join('\n');
}

export function main(args) {
  const [action, filename] = args;
  try {
    const input = readFileSync(filename, 'utf8');
    const record = JSON.parse(input);
    const errors = validate(record, action);
    if (errors.length) { console.error(errors.join('\n')); return 1; }
    const digest = createHash('sha256').update(input).digest('hex');
    console.log(render(record, digest));
    return 0;
  } catch (error) { console.error(error.message); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
