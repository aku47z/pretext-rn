#!/usr/bin/env node

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

const FINAL_MARKER = '[pretext-rn legacy] parity-final-json';
const ROW_MARKER = '[pretext-rn legacy] parity-row-json';
const ZERO_PX_DELTA = 0;

const caseIds = [
  'latin-regular',
  'latin-bold',
  'latin-italic',
  'latin-monospace',
  'line-height-normal',
  'line-height-tight',
  'line-height-loose',
  'width-narrow-100',
  'width-medium-240',
  'width-wide-360',
  'max-lines-1',
  'max-lines-2',
  'max-lines-3',
  'emoji-single',
  'emoji-zwj-family',
  'emoji-flag-sequence',
  'cjk-text',
  'arabic-text',
  'hindi-devanagari',
  'mixed-script',
  'custom-font-inter-regular',
  'custom-font-jetbrainsmono-regular',
  'custom-font-charmonman-regular',
  'custom-font-notosans-latin',
  'custom-font-notosans-arabic',
  'custom-font-notosans-devanagari',
  'custom-font-notosans-condensed',
  'custom-font-notosans-semicondensed',
  'font-scale-1x',
  'font-scale-1-5x',
  'font-scale-2x',
  'font-scale-active-runtime',
  'empty-string',
  'long-string-10k',
  'zero-width-normalized',
];

const exploratoryCaseIds = new Set([
  'line-height-normal',
  'line-height-tight',
  'width-narrow-100',
  'zero-width-normalized',
  'custom-font-inter-regular',
  'custom-font-jetbrainsmono-regular',
  'custom-font-charmonman-regular',
  'custom-font-notosans-latin',
  'custom-font-notosans-arabic',
  'custom-font-notosans-devanagari',
  'custom-font-notosans-condensed',
  'custom-font-notosans-semicondensed',
]);

const defaultThresholds = Object.fromEntries(
  caseIds.map(id => [id, ZERO_PX_DELTA]),
);

const exploratoryThresholds = {
  'line-height-normal': 4,
  'line-height-tight': 3,
  'width-narrow-100': 58,
  'zero-width-normalized': 424,
  'custom-font-inter-regular': 1,
  'custom-font-jetbrainsmono-regular': 1,
  'custom-font-charmonman-regular': 1,
  'custom-font-notosans-latin': 1,
  'custom-font-notosans-arabic': 6,
  'custom-font-notosans-devanagari': 1,
  'custom-font-notosans-condensed': 1,
  'custom-font-notosans-semicondensed': 1,
};

function readBooleanEnv(name) {
  const value = process.env[name];
  if (!value) {
    return false;
  }

  return value === '1' || value.toLowerCase() === 'true';
}

function parseThresholds() {
  const allowExploratory = readBooleanEnv('PRETEXT_PARITY_ALLOW_EXPLORATORY');
  const source = process.env.PRETEXT_PARITY_THRESHOLDS_JSON;
  const baseline = allowExploratory
    ? {...defaultThresholds, ...exploratoryThresholds}
    : defaultThresholds;

  if (!source) {
    return baseline;
  }

  try {
    const parsed = JSON.parse(source);
    return {...baseline, ...parsed};
  } catch (error) {
    console.error('Failed to parse PRETEXT_PARITY_THRESHOLDS_JSON:', error);
    process.exit(2);
  }
}

function shouldEvaluateCase(caseId, exploratoryMode) {
  return exploratoryMode ? true : !exploratoryCaseIds.has(caseId);
}

function readLogSource() {
  if (process.env.PRETEXT_PARITY_LOG_FILE) {
    return readFileSync(process.env.PRETEXT_PARITY_LOG_FILE, 'utf8');
  }

  const lookback = process.env.PRETEXT_PARITY_IOS_LOOKBACK ?? '10m';
  const args = [
    'simctl',
    'spawn',
    'booted',
    'log',
    'show',
    '--debug',
    '--info',
    '--style',
    'compact',
    '--last',
    lookback,
    '--predicate',
    'subsystem == "com.facebook.react.log" OR eventMessage CONTAINS "pretext-rn legacy"',
  ];

  return execFileSync('xcrun', args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readPersistedRowsFromSandbox() {
  const bundleId =
    process.env.PRETEXT_PARITY_IOS_BUNDLE_ID ??
    'org.reactjs.native.example.HostAppLegacy';
  const relativeFile =
    process.env.PRETEXT_PARITY_IOS_FILE_RELATIVE ??
    'Documents/pretext-parity-ios.json';

  try {
    const containerPath = execFileSync(
      'xcrun',
      ['simctl', 'get_app_container', 'booted', bundleId, 'data'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ).trim();

    if (!containerPath) {
      return null;
    }

    const absoluteFile = path.join(containerPath, relativeFile);
    if (!existsSync(absoluteFile)) {
      return null;
    }

    const parsed = JSON.parse(readFileSync(absoluteFile, 'utf8'));
    if (!Array.isArray(parsed)) {
      return null;
    }

    const map = new Map(parsed.map(row => [row.id, row]));
    const allPresent = caseIds.every(id => map.has(id));
    const allUsable = caseIds.every(id => isUsableRow(map.get(id)));

    if (!allPresent || !allUsable) {
      return null;
    }

    return caseIds.map(id => map.get(id));
  } catch {
    return null;
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function normalizeJsonCandidate(rawValue) {
  let candidate = rawValue.trim().replace(/^,\s*/, '');

  if (
    (candidate.startsWith("'") && candidate.endsWith("'")) ||
    (candidate.startsWith('"') && candidate.endsWith('"'))
  ) {
    candidate = candidate.slice(1, -1);
  }

  candidate = candidate.replace(/\\"/g, '"');
  return candidate;
}

function parsePayloadJson(afterMarker, opener) {
  const quotedPattern = new RegExp(
    `,\\s*['\"](${opener === '{' ? '\\{.*\\}' : '\\[.*\\]'})['\"]\\s*$`,
  );
  const quotedMatch = afterMarker.match(quotedPattern);
  if (quotedMatch?.[1]) {
    try {
      return JSON.parse(quotedMatch[1]);
    } catch {
      return null;
    }
  }

  const jsonStart = afterMarker.indexOf(opener);
  if (jsonStart === -1) {
    return null;
  }

  const rawJson = normalizeJsonCandidate(afterMarker.slice(jsonStart));
  try {
    return JSON.parse(rawJson);
  } catch {
    return null;
  }
}

function parseFinalRows(line) {
  const markerIndex = line.indexOf(FINAL_MARKER);
  if (markerIndex === -1) {
    return null;
  }

  const afterMarker = line.slice(markerIndex + FINAL_MARKER.length);
  const parsed = parsePayloadJson(afterMarker, '[');
  return Array.isArray(parsed) ? parsed : null;
}

function parseRow(line) {
  const markerIndex = line.indexOf(ROW_MARKER);
  if (markerIndex === -1) {
    return null;
  }

  const afterMarker = line.slice(markerIndex + ROW_MARKER.length);
  const parsed = parsePayloadJson(afterMarker, '{');
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function isUsableRow(row) {
  const hasTerminalError =
    typeof row?.error === 'string' && row.error !== 'install pending';

  return (
    typeof row?.id === 'string' &&
    (typeof row?.absDeltaPx === 'number' || hasTerminalError)
  );
}

function findLatestCompleteRows(logText) {
  const lines = logText.split(/\r?\n/);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const parsed = parseFinalRows(lines[index]);
    if (!parsed) {
      continue;
    }

    const map = new Map(parsed.map(row => [row.id, row]));
    const allPresent = caseIds.every(id => map.has(id));
    const allUsable = caseIds.every(id => isUsableRow(map.get(id)));
    if (allPresent && allUsable) {
      return caseIds.map(id => map.get(id));
    }
  }

  const rowMap = new Map();
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const row = parseRow(lines[index]);
    if (!row || rowMap.has(row.id)) {
      continue;
    }
    rowMap.set(row.id, row);
  }

  const allPresent = caseIds.every(id => rowMap.has(id));
  const allUsable = caseIds.every(id => isUsableRow(rowMap.get(id)));
  if (allPresent && allUsable) {
    return caseIds.map(id => rowMap.get(id));
  }

  return null;
}

async function main() {
  const exploratoryMode = readBooleanEnv('PRETEXT_PARITY_ALLOW_EXPLORATORY');
  const thresholds = parseThresholds();

  const waitMs = Number.parseInt(
    process.env.PRETEXT_PARITY_WAIT_MS ?? '12000',
    10,
  );
  const pollMs = Number.parseInt(
    process.env.PRETEXT_PARITY_POLL_MS ?? '800',
    10,
  );
  const lookback = process.env.PRETEXT_PARITY_IOS_LOOKBACK ?? '10m';

  console.log(
    `Waiting for parity logs (lookback=${lookback}, timeout=${waitMs}ms, poll=${pollMs}ms)...`,
  );
  console.log(
    `Threshold mode: ${
      exploratoryMode ? 'exploratory-allowed' : 'strict-zero'
    }`,
  );

  const start = Date.now();
  let rows = null;
  let source = null;
  while (Date.now() - start <= waitMs) {
    rows = readPersistedRowsFromSandbox();
    if (rows) {
      source = 'ios-sandbox-file';
      break;
    }

    rows = findLatestCompleteRows(readLogSource());
    if (rows) {
      source = 'ios-unified-log';
      break;
    }
    await delay(pollMs);
  }

  if (!rows) {
    console.error(
      'No complete parity rows found in iOS sandbox file or unified log output.',
    );
    process.exit(1);
  }

  console.log(`Parity row source: ${source}`);

  const skipped = [];
  const failures = [];
  const summary = [];

  for (const row of rows) {
    if (!shouldEvaluateCase(row.id, exploratoryMode)) {
      skipped.push(row.id);
      summary.push(`${row.id}: skipped-exploratory`);
      continue;
    }

    if (row.error) {
      failures.push(`- ${row.id} reported terminal error (${row.error})`);
      summary.push(`${row.id}: error=${row.error}`);
      continue;
    }

    const threshold = thresholds[row.id] ?? ZERO_PX_DELTA;
    const absDeltaPx = row.absDeltaPx ?? Number.POSITIVE_INFINITY;
    summary.push(`${row.id}: absDeltaPx=${absDeltaPx}`);

    if (absDeltaPx > threshold) {
      failures.push(
        `- ${row.id} exceeded threshold (${absDeltaPx} > ${threshold})`,
      );
    }
  }

  if (skipped.length > 0) {
    console.log(
      `Skipped exploratory cases in strict mode: ${skipped.join(', ')}`,
    );
  }

  if (failures.length > 0) {
    console.error(`iOS parity assertion failed. ${summary.join(', ')}`);
    failures.forEach(line => console.error(line));
    process.exit(1);
  }

  console.log(`iOS parity assertion passed. ${summary.join(', ')}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
