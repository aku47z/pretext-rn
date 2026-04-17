#!/usr/bin/env node

import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

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

  const serial = process.env.ANDROID_SERIAL;
  const serialArgs = serial ? ['-s', serial] : [];
  const lookback = process.env.PRETEXT_PARITY_ANDROID_LOOKBACK ?? '5m';

  try {
    return execFileSync(
      'adb',
      [...serialArgs, 'logcat', '-d', '-T', lookback],
      {
        encoding: 'utf8',
        maxBuffer: 30 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch {
    return execFileSync(
      'adb',
      [...serialArgs, 'logcat', '-d', '-s', 'ReactNativeJS:I', '*:S'],
      {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  }
}

function readPersistedRowsFromDevice() {
  const serial = process.env.ANDROID_SERIAL;
  const serialArgs = serial ? ['-s', serial] : [];
  const appId =
    process.env.PRETEXT_PARITY_ANDROID_APP_ID ?? 'com.hostapplegacy';

  try {
    const raw = execFileSync(
      'adb',
      [
        ...serialArgs,
        'shell',
        'run-as',
        appId,
        'cat',
        'files/pretext_parity_rows.json',
      ],
      {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ).trim();

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const rowMap = new Map(parsed.map(row => [row.id, row]));
    const allPresent = caseIds.every(id => rowMap.has(id));
    const allUsable = caseIds.every(id => isUsableRow(rowMap.get(id)));
    if (!allPresent || !allUsable) {
      return null;
    }

    return caseIds.map(id => rowMap.get(id));
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
  const lookback = process.env.PRETEXT_PARITY_ANDROID_LOOKBACK ?? '5m';

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
  while (Date.now() - start <= waitMs) {
    rows = readPersistedRowsFromDevice();
    if (!rows) {
      rows = findLatestCompleteRows(readLogSource());
    }
    if (rows) {
      break;
    }
    await delay(pollMs);
  }

  if (!rows) {
    console.error('No complete parity-json rows found in log output.');
    process.exit(1);
  }

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
    console.error(`Android parity assertion failed. ${summary.join(', ')}`);
    failures.forEach(line => console.error(line));
    process.exit(1);
  }

  console.log(`Android parity assertion passed. ${summary.join(', ')}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
