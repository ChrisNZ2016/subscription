#!/usr/bin/env node
/**
 * Mint a one-click add-to-subscription URL.
 *
 * Local (no Recurpay call) — you already know the subscription id:
 *   LINK_SIGNING_SECRET=... \
 *   ADDON_CAMPAIGNS='[{"slug":"poop-bags-120","variantId":10597447106596,"quantity":1,"isOnetime":false,"label":"Compostable poop bags (120-pack)","ttlDays":14}]' \
 *   node scripts/generate-addon-link.mjs --subscription-id 755190 --campaign poop-bags-120 --local
 *
 * Via the live mint endpoint (looks up Recurpay, optionally writes Klaviyo):
 *   ADDON_LINK_SECRET=... \
 *   node scripts/generate-addon-link.mjs --email person@example.com --campaign poop-bags-120
 */

const BASE =
  process.env.ADDON_PUBLIC_BASE_URL?.replace(/\/+$/, '') ||
  'https://lp.littlegreendog.co.nz';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function has(flag) {
  return process.argv.includes(flag);
}

const DEFAULT_CAMPAIGNS = [
  {
    slug: 'poop-bags-60',
    variantId: 10597438849060,
    quantity: 1,
    isOnetime: false,
    label: 'Compostable poop bags (60-pack)',
    ttlDays: 14,
  },
  {
    slug: 'poop-bags-120',
    variantId: 10597447106596,
    quantity: 1,
    isOnetime: false,
    label: 'Compostable poop bags (120-pack)',
    ttlDays: 14,
  },
];

function parseCampaigns(raw) {
  if (!raw) return DEFAULT_CAMPAIGNS;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('ADDON_CAMPAIGNS must be a JSON array');
  return parsed;
}

async function hmacBase64Url(secret, data) {
  const { createHmac } = await import('node:crypto');
  return createHmac('sha256', secret).update(data).digest('base64url');
}

async function mintLocal({ subscriptionId, campaign, variantId, quantity, isOnetime, ttlDays }) {
  if (!subscriptionId || !variantId) {
    throw new Error('--local requires --subscription-id and a campaign or --variant-id');
  }
  const secret = process.env.LINK_SIGNING_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('LINK_SIGNING_SECRET is missing or too short');
  }
  const { randomBytes } = await import('node:crypto');
  const payload = {
    sid: subscriptionId,
    vid: variantId,
    exp: Math.floor(Date.now() / 1000) + (ttlDays || 7) * 24 * 60 * 60,
    n: randomBytes(16).toString('base64url'),
    q: quantity || 1,
    o: Boolean(isOnetime),
    c: campaign,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = await hmacBase64Url(secret, `v1.${body}`);
  const token = `v1.${body}.${sig}`;
  const durableSig = await hmacBase64Url(secret, `v1:sid:${subscriptionId}`);
  return {
    url: `${BASE}/add-to-subscription?t=${encodeURIComponent(token)}`,
    campaignUrl: campaign
      ? `${BASE}/add-to-subscription/${campaign}?sid=${subscriptionId}&sig=${durableSig}`
      : null,
    subscriptionId,
    recurpay_link_sig: durableSig,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

async function mintRemote({ email, subscriptionId, campaign, variantId }) {
  const secret = process.env.ADDON_LINK_SECRET;
  if (!secret) throw new Error('ADDON_LINK_SECRET is required unless using --local');
  const endpoint = process.env.ADDON_MINT_URL || `${BASE}/api/addon-link`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Addon-Link-Secret': secret,
    },
    body: JSON.stringify({
      email,
      subscriptionId,
      campaign,
      variantId,
    }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Mint endpoint ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json.error || `Mint endpoint ${res.status}`);
  return json;
}

const local = has('--local');
const campaignSlug = arg('--campaign');
const email = arg('--email');
const subscriptionId = arg('--subscription-id') ? Number(arg('--subscription-id')) : undefined;
const variantIdArg = arg('--variant-id') ? Number(arg('--variant-id')) : undefined;

if (!subscriptionId && !email) {
  console.error('Pass --subscription-id <id> or --email <addr>');
  process.exit(1);
}

let campaign;
if (campaignSlug) {
  campaign = parseCampaigns(process.env.ADDON_CAMPAIGNS).find((c) => c.slug === campaignSlug);
  if (local && !campaign) {
    console.error(`Unknown campaign '${campaignSlug}'. Set ADDON_CAMPAIGNS.`);
    process.exit(1);
  }
}

const result = local
  ? await mintLocal({
      subscriptionId,
      campaign: campaignSlug,
      variantId: campaign?.variantId ?? variantIdArg,
      quantity: campaign?.quantity,
      isOnetime: campaign?.isOnetime,
      ttlDays: campaign?.ttlDays,
    })
  : await mintRemote({
      email,
      subscriptionId,
      campaign: campaignSlug,
      variantId: variantIdArg,
    });

console.log(JSON.stringify(result, null, 2));
