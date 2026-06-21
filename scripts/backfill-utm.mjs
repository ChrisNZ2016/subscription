#!/usr/bin/env node
/**
 * Backfill lost UTM attribution onto Mixpanel profiles.
 *
 * Why: Purchase Completed events fire on the Shopify checkout domain, which
 * strips UTM params from the URL. The attribution is still recoverable because
 * each buyer's distinct_id matches an earlier UTM-bearing event (Page Viewed /
 * Checkout Started) on the landing domain.
 *
 * What it does:
 *   1. Reads events (from the Mixpanel Raw Export API, or a local CSV export).
 *   2. Builds a distinct_id -> first-touch UTM map from any UTM-bearing event.
 *   3. For every distinct_id that has a Purchase Completed event, writes
 *      initial_utm_* (set_once) and utm_* (set, last seen) to the profile via
 *      the Mixpanel /engage API.
 *
 * Mixpanel events are immutable, so this fixes user/revenue-level attribution
 * (break down People + revenue by initial_utm_campaign etc.), not the historical
 * event properties themselves.
 *
 * USAGE
 *   Dry run from the Raw Export API (no writes):
 *     MIXPANEL_PROJECT_ID=3998821 \
 *     MIXPANEL_SERVICE_ACCOUNT_USERNAME=xxx \
 *     MIXPANEL_SERVICE_ACCOUNT_SECRET=yyy \
 *     MIXPANEL_TOKEN=cc67318fe82b66a1b37843f09348fa4b \
 *     node scripts/backfill-utm.mjs --from 2024-01-01 --to 2026-06-21
 *
 *   Dry run from a CSV export (e.g. the sample you already have):
 *     MIXPANEL_TOKEN=cc67318fe82b66a1b37843f09348fa4b \
 *     node scripts/backfill-utm.mjs --csv ~/Downloads/events-export.csv
 *
 *   Add --commit to actually write profile updates to Mixpanel.
 *   Add --region eu for EU-residency projects.
 */

import fs from 'node:fs';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const PURCHASE_EVENT = 'Purchase Completed';

// ─── Args ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { commit: false, region: 'us' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--commit') args.commit = true;
    else if (a === '--csv') args.csv = argv[++i];
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else if (a === '--region') args.region = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const TOKEN = process.env.MIXPANEL_TOKEN;
const PROJECT_ID = process.env.MIXPANEL_PROJECT_ID;
const SA_USER = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME;
const SA_SECRET = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET;

const DATA_HOST = args.region === 'eu' ? 'data-eu.mixpanel.com' : 'data.mixpanel.com';
const API_HOST = args.region === 'eu' ? 'api-eu.mixpanel.com' : 'api.mixpanel.com';

// ─── Event sources ────────────────────────────────────────────────────────────

/** Yields { event, distinctId, time, utm } from a Mixpanel CSV export. */
function* readCsv(path) {
  const text = fs.readFileSync(path, 'utf8');
  const rows = parseCsv(text);
  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const iEvent = idx('Event Name');
  const iTime = idx('Time');
  const iDid = idx('Distinct ID');
  const utmCols = {
    utm_source: idx('UTM Source'),
    utm_medium: idx('UTM Medium'),
    utm_campaign: idx('UTM Campaign'),
    utm_content: idx('UTM Content'),
    utm_term: idx('UTM Term'),
  };
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row.length || !row[iEvent]) continue;
    const utm = {};
    for (const k of UTM_KEYS) {
      const v = utmCols[k] >= 0 ? row[utmCols[k]] : '';
      if (v) utm[k] = v;
    }
    yield {
      event: row[iEvent],
      distinctId: row[iDid],
      time: parseFloat(row[iTime]) || 0,
      utm,
    };
  }
}

/** Minimal RFC-4180 CSV parser (handles quotes, commas, newlines in fields). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Yields events from the Mixpanel Raw Export API (JSONL stream). */
async function* readExportApi(from, to) {
  if (!SA_USER || !SA_SECRET || !PROJECT_ID) {
    throw new Error(
      'Raw Export needs MIXPANEL_SERVICE_ACCOUNT_USERNAME, MIXPANEL_SERVICE_ACCOUNT_SECRET, MIXPANEL_PROJECT_ID (or use --csv).',
    );
  }
  if (!from || !to) throw new Error('Provide --from and --to (YYYY-MM-DD) for the Export API.');

  const url = `https://${DATA_HOST}/api/2.0/export?from_date=${from}&to_date=${to}&project_id=${PROJECT_ID}`;
  const auth = Buffer.from(`${SA_USER}:${SA_SECRET}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'text/plain' } });
  if (!res.ok) throw new Error(`Export API ${res.status}: ${await res.text()}`);

  let buffer = '';
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield normalizeExport(JSON.parse(line));
    }
  }
  if (buffer.trim()) yield normalizeExport(JSON.parse(buffer.trim()));
}

function normalizeExport(raw) {
  const p = raw.properties || {};
  const utm = {};
  for (const k of UTM_KEYS) {
    if (p[k]) utm[k] = String(p[k]);
  }
  return {
    event: raw.event,
    distinctId: p.distinct_id || p.$distinct_id || '',
    time: p.time || 0,
    utm,
  };
}

// ─── Engage writes ────────────────────────────────────────────────────────────

async function flushEngage(batch) {
  const url = `https://${API_HOST}/engage?verbose=1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Engage ${res.status}: ${text}`);
  let json;
  try { json = JSON.parse(text); } catch { json = {}; }
  if (json.status !== 1) throw new Error(`Engage rejected batch: ${text}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!TOKEN) throw new Error('Set MIXPANEL_TOKEN (project token) for profile writes.');

  const source = args.csv ? readCsv(args.csv) : readExportApi(args.from, args.to);

  // distinct_id -> { first: {utm,time}, last: {utm,time} }
  const utmByDid = new Map();
  const purchasers = new Set();
  let total = 0;

  for await (const ev of source) {
    total++;
    if (ev.event === PURCHASE_EVENT && ev.distinctId) purchasers.add(ev.distinctId);
    if (ev.distinctId && Object.keys(ev.utm).length) {
      const cur = utmByDid.get(ev.distinctId);
      if (!cur) {
        utmByDid.set(ev.distinctId, { first: { utm: ev.utm, time: ev.time }, last: { utm: ev.utm, time: ev.time } });
      } else {
        if (ev.time < cur.first.time) cur.first = { utm: ev.utm, time: ev.time };
        if (ev.time > cur.last.time) cur.last = { utm: ev.utm, time: ev.time };
      }
    }
  }

  const updates = [];
  let matched = 0;
  let unmatched = 0;
  for (const did of purchasers) {
    const rec = utmByDid.get(did);
    if (!rec) { unmatched++; continue; }
    matched++;
    const setOnce = {};
    for (const [k, v] of Object.entries(rec.first.utm)) setOnce[`initial_${k}`] = v;
    const set = { ...rec.last.utm };
    updates.push({
      $token: TOKEN,
      $distinct_id: did,
      $ip: 0,
      $set: set,
      $set_once: setOnce,
    });
  }

  console.log(`Events scanned:        ${total}`);
  console.log(`Purchasers:            ${purchasers.size}`);
  console.log(`  with recoverable UTM: ${matched}`);
  console.log(`  no UTM found:         ${unmatched}`);
  console.log(`Profile updates queued: ${updates.length}`);

  if (updates.length) {
    const sample = updates[0];
    console.log('\nExample update:');
    console.log(JSON.stringify({ $distinct_id: sample.$distinct_id, $set: sample.$set, $set_once: sample.$set_once }, null, 2));
  }

  if (!args.commit) {
    console.log('\nDRY RUN — no writes. Re-run with --commit to apply.');
    return;
  }

  console.log('\nWriting to Mixpanel /engage ...');
  for (let i = 0; i < updates.length; i += 200) {
    const batch = updates.slice(i, i + 200);
    await flushEngage(batch);
    console.log(`  wrote ${Math.min(i + batch.length, updates.length)}/${updates.length}`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
