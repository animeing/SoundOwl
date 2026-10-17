const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || 'test-results/layout-regression');
const outputPath = path.resolve(process.argv[3] || path.join(root, 'ci-summary.md'));
const label = process.env.SOUNDOWL_LAYOUT_LABEL || 'local';
const summaryFiles = findFiles(root, 'summary.json');
const summaries = summaryFiles.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
const comparisons = summaries.flatMap((summary) => summary.comparisons || []);
const routeRows = aggregate(comparisons, (comparison) => comparison.route.name);
const viewportRows = aggregate(comparisons, (comparison) => comparison.viewport);
const totals = calculateTotals(comparisons);
const lines = [
  `# Layout diff: ${label}`,
  '',
  `- Commit: \`${(process.env.GITHUB_SHA || 'local').slice(0, 12)}\``,
  `- Comparisons: ${totals.comparisons}`,
  `- Failed: ${totals.failed}`,
  `- Diff pixels: ${formatNumber(totals.diffPixels)}`,
  `- Layout issues: ${totals.layoutIssues}`,
  `- Browser errors: ${totals.browserErrors}`,
  '',
  '## By route',
  '',
  '| Route | Cases | Failed | Diff pixels | Max diff | Max case | Layout issues | Browser errors |',
  '| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |',
  ...routeRows.map(markdownRow),
  '',
  '## By viewport',
  '',
  '| Viewport | Cases | Failed | Diff pixels | Max diff | Max case | Layout issues | Browser errors |',
  '| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |',
  ...viewportRows.map(markdownRow),
  '',
  `Detailed screenshots and comparison JSON are in \`frontend-layout-regression-${label}\`.`,
  '',
];

if (comparisons.length === 0) {
  lines.splice(2, lines.length - 2, 'No layout comparison summaries were generated.', '');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const markdown = `${lines.join('\n')}\n`;
fs.writeFileSync(outputPath, markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

console.log(`::notice title=Layout summary (${label})::${escapeCommand(annotationText(totals))}`);
for (const row of routeRows) {
  console.log(`::notice title=${escapeCommand(row.name)} (${label})::${escapeCommand(annotationText(row))}`);
}
console.log(`[layout] wrote ${outputPath}`);

function findFiles(directory, fileName) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findFiles(entryPath, fileName);
      return entry.name === fileName ? [entryPath] : [];
    })
    .sort();
}

function aggregate(items, keyFor) {
  const rows = new Map();
  for (const item of items) {
    const key = keyFor(item);
    const row = rows.get(key) || emptyRow(key);
    addComparison(row, item);
    rows.set(key, row);
  }
  return [...rows.values()];
}

function calculateTotals(items) {
  const row = emptyRow('total');
  for (const item of items) addComparison(row, item);
  return row;
}

function emptyRow(name) {
  return {
    name,
    comparisons: 0,
    failed: 0,
    diffPixels: 0,
    layoutIssues: 0,
    browserErrors: 0,
    maxDiffRatio: 0,
    maxCase: '-',
  };
}

function addComparison(row, comparison) {
  row.comparisons += 1;
  row.failed += comparison.passed ? 0 : 1;
  row.diffPixels += comparison.diffPixels || 0;
  row.layoutIssues += comparison.layoutIssues?.length || 0;
  row.browserErrors += comparison.browserErrors?.length || 0;
  if ((comparison.diffRatio || 0) >= row.maxDiffRatio) {
    row.maxDiffRatio = comparison.diffRatio || 0;
    row.maxCase = `${comparison.viewport}/${comparison.route.name}/${comparison.state.name}`;
  }
}

function markdownRow(row) {
  return `| ${row.name} | ${row.comparisons} | ${row.failed} | ${formatNumber(row.diffPixels)} | ${formatPercent(row.maxDiffRatio)} | ${row.maxCase} | ${row.layoutIssues} | ${row.browserErrors} |`;
}

function annotationText(row) {
  return `${row.comparisons} cases, ${row.failed} failed, ${formatNumber(row.diffPixels)} diff pixels, max ${formatPercent(row.maxDiffRatio)} at ${row.maxCase}, ${row.layoutIssues} layout issues, ${row.browserErrors} browser errors`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(4)}%`;
}

function escapeCommand(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A')
    .replaceAll(':', '%3A')
    .replaceAll(',', '%2C');
}
