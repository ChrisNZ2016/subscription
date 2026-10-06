#!/usr/bin/env node
/**
 * One-time backfill for the Sample Abuse ledger + customer tags.
 *
 * What it does (idempotent, resumable):
 *   1. Pages every order containing SKU LGD-KBL-SAM.
 *   2. Tags each order's customer `sample_purchased`.
 *   3. Writes the address ledger (single JSON metafield sample_abuse.address_ledger),
 *      first-seen-wins per hashed shipping address.
 *   4. Tags any repeat order (same customer OR same address, beyond the first)
 *      `sample_abuse_review` — NO hold, NO email (historical orders already shipped).
 *
 * Requires in .env (same dir as repo root):
 *   SHOPIFY_ADMIN_TOKEN=shpat_...
 *   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
 *   SHOPIFY_API_VERSION=2026-07        (optional; defaults below)
 *
 * Run:  node scripts/backfill-sample-abuse.mjs           (dry run: prints plan, writes nothing)
 *       node scripts/backfill-sample-abuse.mjs --apply    (executes)
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- tiny .env loader (no dependency) ---
function loadEnv() {
  const out = {};
  try {
    const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return { ...out, ...process.env };
}

const env = loadEnv();
const TOKEN = env.SHOPIFY_ADMIN_TOKEN;
const DOMAIN = env.SHOPIFY_STORE_DOMAIN;
const VERSION = env.SHOPIFY_API_VERSION || "2026-07";
const SHOP_GID = "gid://shopify/Shop/7032143908";
const SAMPLE_SKU = "LGD-KBL-SAM";
const APPLY = process.argv.includes("--apply");

if (!TOKEN || !DOMAIN) {
  console.error("Missing SHOPIFY_ADMIN_TOKEN or SHOPIFY_STORE_DOMAIN in .env");
  process.exit(1);
}

const ENDPOINT = `https://${DOMAIN}/admin/api/${VERSION}/graphql.json`;

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  // Respect throttling: if we're low on cost budget, pause.
  const t = json?.extensions?.cost?.throttleStatus;
  if (t && t.currentlyAvailable < 200) {
    await sleep(1000);
  }
  if (json.errors) {
    throw new Error("GraphQL errors: " + JSON.stringify(json.errors));
  }
  return json.data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hashAddr(address1, zip) {
  const a = (address1 ?? "").trim().toLowerCase();
  const z = (zip ?? "").replace(/ /g, "").toLowerCase();
  return createHash("sha256").update(`${a}|${z}`.trim()).digest("hex");
}

// --- 1. Fetch all sample orders ---
async function fetchOrders() {
  const orders = [];
  let after = null;
  do {
    const data = await gql(
      `query($after:String){
         orders(first:100, query:"sku:${SAMPLE_SKU}", after:$after, sortKey:CREATED_AT){
           edges{ node{
             id name email
             customer{ id }
             shippingAddress{ address1 zip }
             billingAddress{ address1 zip }
           }}
           pageInfo{ hasNextPage endCursor }
         }
       }`,
      { after }
    );
    for (const e of data.orders.edges) orders.push(e.node);
    after = data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null;
    process.stderr.write(`  fetched ${orders.length} orders\r`);
  } while (after);
  process.stderr.write("\n");
  return orders;
}

async function main() {
  console.log(`Backfill — ${APPLY ? "APPLY" : "DRY RUN"} against ${DOMAIN} (${VERSION})`);
  const orders = await fetchOrders();
  console.log(`Total sample orders: ${orders.length}`);

  const ledger = {};             // hash -> {email, order_name}  first-seen wins
  const seenCustomer = new Set();
  const repeatOrders = [];       // {name, reason}
  const customersToTag = new Map(); // customerGid -> true

  for (const o of orders) {
    const addr = o.shippingAddress || o.billingAddress;
    const key = addr ? hashAddr(addr.address1, addr.zip) : null;
    const custRepeat = o.customer && seenCustomer.has(o.customer.id);
    const addrRepeat = key && key in ledger;

    if (o.customer) {
      customersToTag.set(o.customer.id, true);
      seenCustomer.add(o.customer.id);
    }
    if (key && !(key in ledger)) ledger[key] = { email: o.email, order_name: o.name };
    if (custRepeat || addrRepeat) {
      repeatOrders.push({
        id: o.id,
        name: o.name,
        reason: custRepeat && addrRepeat ? "customer+address"
              : custRepeat ? "customer" : "address",
      });
    }
  }

  console.log(`Distinct customers to tag: ${customersToTag.size}`);
  console.log(`Ledger addresses: ${Object.keys(ledger).length}`);
  console.log(`Repeat orders to flag: ${repeatOrders.length}`);
  console.log(repeatOrders.map((r) => `  ${r.name} (${r.reason})`).join("\n"));

  if (!APPLY) {
    console.log("\nDRY RUN complete. Re-run with --apply to execute.");
    return;
  }

  // --- 2. Write ledger (single atomic write) ---
  console.log("\nWriting ledger metafield...");
  const setLedger = await gql(
    `mutation($value:String!){
       metafieldsSet(metafields:[{
         ownerId:"${SHOP_GID}", namespace:"sample_abuse", key:"address_ledger",
         type:"json", value:$value
       }]){ userErrors{ field message } }
     }`,
    { value: JSON.stringify(ledger) }
  );
  const le = setLedger.metafieldsSet.userErrors;
  if (le.length) throw new Error("ledger write errors: " + JSON.stringify(le));
  console.log("  ledger written ✓");

  // --- 3. Tag customers ---
  console.log("Tagging customers...");
  let n = 0;
  for (const gid of customersToTag.keys()) {
    const r = await gql(
      `mutation($id:ID!){ tagsAdd(id:$id, tags:["sample_purchased"]){ userErrors{ message } } }`,
      { id: gid }
    );
    const errs = r.tagsAdd.userErrors;
    if (errs.length) console.warn(`  WARN ${gid}: ${JSON.stringify(errs)}`);
    n++;
    if (n % 25 === 0) process.stderr.write(`  tagged ${n}/${customersToTag.size}\r`);
    await sleep(120); // gentle pacing
  }
  process.stderr.write(`\n`);
  console.log(`  tagged ${n} customers ✓`);

  // --- 4. Flag repeat orders ---
  console.log("Flagging repeat orders...");
  for (const r of repeatOrders) {
    const res = await gql(
      `mutation($id:ID!){ tagsAdd(id:$id, tags:["sample_abuse_review"]){ userErrors{ message } } }`,
      { id: r.id }
    );
    const errs = res.tagsAdd.userErrors;
    if (errs.length) console.warn(`  WARN ${r.name}: ${JSON.stringify(errs)}`);
    else console.log(`  flagged ${r.name} (${r.reason}) ✓`);
    await sleep(120);
  }

  console.log("\nBackfill complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
