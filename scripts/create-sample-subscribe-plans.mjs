#!/usr/bin/env node
/**
 * One-time setup: create two-tier Shopify selling plans on sample variants.
 *
 * Each plan: cycle 1 = $19.99 fixed, cycle 2+ = discounted recurring price for that bag size.
 *
 * USAGE (from repo root, requires .env with SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET):
 *   node scripts/create-sample-subscribe-plans.mjs
 *   node scripts/create-sample-subscribe-plans.mjs --write   # update src/constants/sample-subscribe.ts
 *   node scripts/create-sample-subscribe-plans.mjs --restore-plans  # restore two-tier pricing + original labels
 *
 * Optional env:
 *   SHOPIFY_SHOP=little-green-dog.myshopify.com
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONSTANTS_FILE = path.join(ROOT, 'src/constants/sample-subscribe.ts');

const SHOP = process.env.SHOPIFY_SHOP || 'little-green-dog.myshopify.com';
const SAMPLE_PRICE = '19.99';

const SAMPLE_VARIANTS = {
  2: '46938321223829',
  4: '46938321256597',
  6: '46938321322133',
  8: '46938321289365',
  12: '47496832352405',
  24: '47496832385173',
};

const DISCOUNTED_25 = {
  2: '41.25',
  4: '72.00',
  6: '94.50',
  8: '111.00',
  12: '148.50',
  24: '262.50',
};

const FREQUENCIES = [1, 2, 3];

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function getAccessToken() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET in .env');
  }

  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function adminGraphql(token, query, variables = {}) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

const CREATE_PLAN = `
  mutation CreateSampleSubscribePlan($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput) {
    sellingPlanGroupCreate(input: $input, resources: $resources) {
      sellingPlanGroup {
        id
        sellingPlans(first: 1) {
          nodes { id name }
        }
      }
      userErrors { field message }
    }
  }
`;

const UPDATE_PLAN = `
  mutation UpdateSampleSubscribePlan($id: ID!, $input: SellingPlanGroupInput!) {
    sellingPlanGroupUpdate(id: $id, input: $input) {
      sellingPlanGroup {
        sellingPlans(first: 1) {
          nodes { id name }
        }
      }
      userErrors { field message }
    }
  }
`;

const PLAN_GROUP_QUERY = `
  query SampleSubscribePlanGroup($query: String!) {
    sellingPlanGroups(first: 1, query: $query) {
      nodes {
        id
        name
        sellingPlans(first: 1) {
          nodes { id name }
        }
      }
    }
  }
`;

const LIST_SAMPLE_PLAN_GROUPS = `
  query ListSampleSubscribePlanGroups {
    sellingPlanGroups(first: 50, query: "sample-sub") {
      nodes {
        id
        name
        merchantCode
        sellingPlans(first: 1) {
          nodes { id name }
        }
      }
    }
  }
`;

const VARIANT_QUERY = `
  query SampleVariant($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        id
        title
        displayName
        product { id title }
        selectedOptions { name value }
      }
    }
  }
`;

const VARIANT_BULK_UPDATE = `
  mutation UpdateSampleVariantOption($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id title displayName }
      userErrors { field message }
    }
  }
`;

// The plan name sits directly above Shopify's auto-generated pricing summary
// ("First payment $19.99, then $X every N months") in the cart/checkout, so it
// must NOT restate the prices or the two lines read as a confusing duplicate.
// Keep it a short value message; let Shopify own the pricing line.
function formatPlanName() {
  return 'Sample, then 25% off';
}

function buildSellingPlanInput({ frequencyMonths, recurringPrice, planName }) {
  return {
    name: planName,
    options: [`Every ${frequencyMonths} month${frequencyMonths > 1 ? 's' : ''}`],
    category: 'SUBSCRIPTION',
    billingPolicy: {
      recurring: {
        interval: 'MONTH',
        intervalCount: frequencyMonths,
      },
    },
    deliveryPolicy: {
      recurring: {
        interval: 'MONTH',
        intervalCount: frequencyMonths,
      },
    },
    pricingPolicies: [
      {
        fixed: {
          adjustmentType: 'PRICE',
          adjustmentValue: { fixedValue: SAMPLE_PRICE },
        },
      },
      {
        recurring: {
          adjustmentType: 'PRICE',
          adjustmentValue: { fixedValue: recurringPrice },
          afterCycle: 1,
        },
      },
    ],
  };
}

function formatSampleVariantOptionValue(sizeKg) {
  return `${sizeKg}kg subscription`;
}

async function auditSampleVariants(token) {
  console.log('Sample variant titles in Shopify:\n');
  for (const [sizeKg, variantId] of Object.entries(SAMPLE_VARIANTS)) {
    const data = await adminGraphql(token, VARIANT_QUERY, {
      id: `gid://shopify/ProductVariant/${variantId}`,
    });
    const v = data.node;
    console.log(`  ${sizeKg}kg → product "${v?.product?.title}" / variant "${v?.title}" (${v?.displayName})`);
  }
}

async function updateSampleVariantTitles(token) {
  console.log('Updating sample variant option labels for cleaner checkout…');
  for (const [sizeKg, variantId] of Object.entries(SAMPLE_VARIANTS)) {
    const gid = `gid://shopify/ProductVariant/${variantId}`;
    const data = await adminGraphql(token, VARIANT_QUERY, { id: gid });
    const variant = data.node;
    if (!variant) throw new Error(`Variant not found: ${gid}`);

    const target = formatSampleVariantOptionValue(Number(sizeKg));
    if (variant.title === target) {
      console.log(`  ${sizeKg}kg: already "${target}"`);
      continue;
    }

    const option = variant.selectedOptions[0];
    if (!option) {
      console.log(`  ${sizeKg}kg: skipped (no options on variant)`);
      continue;
    }

    const update = await adminGraphql(token, VARIANT_BULK_UPDATE, {
      productId: variant.product.id,
      variants: [{
        id: gid,
        optionValues: [{ optionName: option.name, name: target }],
      }],
    });
    const result = update.productVariantsBulkUpdate;
    if (result.userErrors?.length) {
      throw new Error(result.userErrors.map((e) => e.message).join('; '));
    }
    const updated = result.productVariants[0];
    console.log(`  ${sizeKg}kg: "${variant.title}" → "${updated.title}"`);
  }
}

function formatSubscriptionDeliveryLabel(frequencyMonths) {
  const freqLabel = frequencyMonths === 1 ? 'month' : `${frequencyMonths} months`;
  return `Delivered every ${freqLabel}`;
}

async function createPlan(token, { sizeKg, frequencyMonths, variantId, recurringPrice }) {
  const merchantCode = `sample-sub-${sizeKg}kg-${frequencyMonths}mo-25`;
  const freqLabel = frequencyMonths === 1 ? 'month' : `${frequencyMonths} months`;
  const name = `Sample ${sizeKg}kg · every ${freqLabel} · 25% off after trial`;
  const planName = formatPlanName();

  const input = {
    name,
    merchantCode,
    options: ['Delivery'],
    sellingPlansToCreate: [buildSellingPlanInput({ frequencyMonths, recurringPrice, planName })],
  };

  const resources = {
    productVariantIds: [`gid://shopify/ProductVariant/${variantId}`],
  };

  const data = await adminGraphql(token, CREATE_PLAN, { input, resources });
  const result = data.sellingPlanGroupCreate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((e) => e.message).join('; '));
  }

  const planGid = result.sellingPlanGroup.sellingPlans.nodes[0]?.id;
  if (!planGid) throw new Error(`No selling plan returned for ${merchantCode}`);
  return planGid;
}

const PLAN_BY_ID_QUERY = `
  query SellingPlanById($id: ID!) {
    node(id: $id) {
      ... on SellingPlan {
        id
        name
      }
    }
  }
`;

async function listSamplePlanGroups(token) {
  const data = await adminGraphql(token, LIST_SAMPLE_PLAN_GROUPS);
  return data.sellingPlanGroups.nodes;
}

function buildPlanGroupIndex(groups) {
  const byMerchantCode = new Map();
  const byPlanId = new Map();
  for (const group of groups) {
    if (group.merchantCode) byMerchantCode.set(group.merchantCode, group);
    for (const plan of group.sellingPlans.nodes) {
      byPlanId.set(plan.id, group);
    }
  }
  return { byMerchantCode, byPlanId };
}

async function lookupPlanByMerchantCode(sizeKg, frequencyMonths, groupIndex) {
  const merchantCode = `sample-sub-${sizeKg}kg-${frequencyMonths}mo-25`;
  const group = groupIndex.byMerchantCode.get(merchantCode);
  if (!group) return null;
  const plan = group.sellingPlans.nodes[0];
  return plan ? { groupName: group.name, merchantCode, groupId: group.id, ...plan } : null;
}

async function restoreFullPlan(token, { planGid, frequencyMonths, recurringPrice, groupIndex }) {
  const group = groupIndex.byPlanId.get(planGid);
  if (!group) throw new Error(`No selling plan group contains ${planGid}`);

  const planName = formatPlanName();
  const data = await adminGraphql(token, UPDATE_PLAN, {
    id: group.id,
    input: {
      sellingPlansToUpdate: [{
        id: planGid,
        ...buildSellingPlanInput({ frequencyMonths, recurringPrice, planName }),
      }],
    },
  });
  const result = data.sellingPlanGroupUpdate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((e) => e.message).join('; '));
  }
  return result.sellingPlanGroup.sellingPlans.nodes[0]?.name ?? planName;
}

async function restorePlans(token, planGids) {
  console.log('Restoring two-tier selling plans (pricing policies + original names)…');
  const groups = await listSamplePlanGroups(token);
  const groupIndex = buildPlanGroupIndex(groups);

  for (const sizeKg of Object.keys(SAMPLE_VARIANTS)) {
    for (const frequencyMonths of FREQUENCIES) {
      const key = `${sizeKg}-${frequencyMonths}-25`;
      const planGid = planGids[key];
      if (!planGid) {
        console.log(`  ${key}: skipped (no gid in constants)`);
        continue;
      }
      const recurringPrice = DISCOUNTED_25[sizeKg];
      const name = await restoreFullPlan(token, {
        planGid,
        frequencyMonths,
        recurringPrice,
        groupIndex,
      });
      console.log(`  ${key} → ${name}`);
    }
  }

  console.log('\nRestoring sample variant option labels…');
  await updateSampleVariantTitles(token);
}

async function updatePlanNameByGid(token, planGid, planLabel, groupIndex) {
  const group = groupIndex.byPlanId.get(planGid);
  if (!group) throw new Error(`No selling plan group contains ${planGid}`);

  const data = await adminGraphql(token, UPDATE_PLAN, {
    id: group.id,
    input: {
      sellingPlansToUpdate: [{ id: planGid, name: planLabel }],
    },
  });
  const result = data.sellingPlanGroupUpdate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((e) => e.message).join('; '));
  }
  return result.sellingPlanGroup.sellingPlans.nodes[0]?.name ?? planLabel;
}

async function syncPlanGids(token, planGids, shouldWrite) {
  console.log('Auditing selling plan IDs vs Shopify…');
  const groups = await listSamplePlanGroups(token);
  const groupIndex = buildPlanGroupIndex(groups);
  console.log(`Found ${groups.length} sample-sub selling plan group(s) in Shopify.\n`);
  let mismatches = 0;
  const synced = { ...planGids };

  for (const sizeKg of Object.keys(SAMPLE_VARIANTS)) {
    for (const frequencyMonths of FREQUENCIES) {
      const key = `${sizeKg}-${frequencyMonths}-25`;
      const constantsGid = planGids[key];
      const live = lookupPlanByMerchantCode(Number(sizeKg), frequencyMonths, groupIndex);

      if (!live) {
        console.log(`  ${key}: MISSING merchant group in Shopify`);
        mismatches++;
        continue;
      }

      let constantsName = null;
      if (constantsGid) {
        const nodeData = await adminGraphql(token, PLAN_BY_ID_QUERY, { id: constantsGid });
        constantsName = nodeData.node?.name ?? '(deleted or invalid id)';
      }

      if (constantsGid !== live.id) {
        mismatches++;
        console.log(`  ${key}: MISMATCH`);
        console.log(`    constants: ${constantsGid} → "${constantsName}"`);
        console.log(`    live:      ${live.id} → "${live.name}"`);
        synced[key] = live.id;
      } else if (constantsName !== live.name) {
        console.log(`  ${key}: id ok, name "${constantsName}"`);
      } else {
        console.log(`  ${key}: ok → "${live.name}"`);
      }
    }
  }

  if (mismatches > 0) {
    console.log(`\n${mismatches} mismatch(es).`);
    if (shouldWrite) {
      writeConstantsFile(synced);
      console.log(`Updated ${CONSTANTS_FILE}`);
    } else {
      console.log('Pass --write to update src/constants/sample-subscribe.ts');
    }
  } else {
    console.log('\nAll plan IDs match Shopify merchant groups.');
  }

  return synced;
}

async function updatePlanName(token, { planGid, planLabel, groupIndex }) {
  return updatePlanNameByGid(token, planGid, planLabel, groupIndex);
}

function formatSellingPlanMap(planGids) {
  const entries = Object.entries(planGids)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, gid]) => `  '${key}': '${gid}',`)
    .join('\n');
  return `export const SELLING_PLAN_GIDS: Record<string, string> = {\n${entries}\n};`;
}

function writeConstantsFile(planGids) {
  let content = fs.readFileSync(CONSTANTS_FILE, 'utf8');
  const replacement = formatSellingPlanMap(planGids);
  content = content.replace(
    /export const SELLING_PLAN_GIDS: Record<string, string> = \{[\s\S]*?\};/,
    replacement,
  );
  fs.writeFileSync(CONSTANTS_FILE, content);
}

/** Parse the existing SELLING_PLAN_GIDS map from the constants file so we only
 *  create plans that don't exist yet (idempotent — avoids duplicate plans). */
function readExistingPlanGids() {
  const content = fs.readFileSync(CONSTANTS_FILE, 'utf8');
  const match = content.match(/export const SELLING_PLAN_GIDS: Record<string, string> = \{([\s\S]*?)\};/);
  const existing = {};
  if (!match) return existing;
  for (const m of match[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    existing[m[1]] = m[2];
  }
  return existing;
}

async function main() {
  loadEnvFile();
  const shouldWrite = process.argv.includes('--write');
  const shouldRestorePlans = process.argv.includes('--restore-plans');
  const token = await getAccessToken();
  const planGids = readExistingPlanGids();
  const existingCount = Object.keys(planGids).length;
  console.log(`Found ${existingCount} existing plan(s); creating only missing ones.`);

  if (shouldRestorePlans) {
    await restorePlans(token, planGids);
    return;
  }

  for (const sizeKg of Object.keys(SAMPLE_VARIANTS)) {
    for (const frequencyMonths of FREQUENCIES) {
      const key = `${sizeKg}-${frequencyMonths}-25`;
      if (planGids[key]) {
        console.log(`Skipping ${key} (already exists: ${planGids[key]})`);
        continue;
      }
      console.log(`Creating ${key}…`);
      const gid = await createPlan(token, {
        sizeKg: Number(sizeKg),
        frequencyMonths,
        variantId: SAMPLE_VARIANTS[sizeKg],
        recurringPrice: DISCOUNTED_25[sizeKg],
      });
      planGids[key] = gid;
      console.log(`  → ${gid}`);
    }
  }

  console.log('\nSelling plan map:');
  console.log(JSON.stringify(planGids, null, 2));

  if (shouldWrite) {
    writeConstantsFile(planGids);
    console.log(`\nUpdated ${CONSTANTS_FILE}`);
  } else {
    console.log('\nPass --write to update src/constants/sample-subscribe.ts');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
