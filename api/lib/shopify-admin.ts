/**
 * Shopify Admin API helpers for the sample-to-subscription webhook.
 */

const SHOP = process.env.SHOPIFY_SHOP || 'little-green-dog.myshopify.com';
const API_VERSION = '2024-10';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function fetchAccessToken(): Promise<string> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET');
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

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const ttlMs = (data.expires_in ?? 86399) * 1000;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ttlMs - 60_000 };
  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  return fetchAccessToken();
}

export async function shopifyAdminGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) {
    throw new Error('Shopify GraphQL returned no data');
  }
  return json.data;
}

// Swaps the product variant on a subscription line AND sets its price in one call.
// Used to change the sample variant to the real kibble-pack variant after the
// first order, so renewals ship the correct SKU while keeping the discounted price.
const PRODUCT_CHANGE = `
  mutation SwapSubscriptionProduct(
    $contractId: ID!
    $lineId: ID!
    $variantId: ID!
    $price: Decimal!
  ) {
    subscriptionContractProductChange(
      subscriptionContractId: $contractId
      lineId: $lineId
      input: { productVariantId: $variantId, currentPrice: $price }
    ) {
      lineUpdated { id variantId currentPrice { amount } }
      userErrors { field message }
    }
  }
`;

const ADD_ORDER_TAG = `
  mutation AddOrderTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }
`;

const CONTRACT_QUERY = `
  query SubscriptionContract($id: ID!) {
    subscriptionContract(id: $id) {
      id
      status
      lines(first: 5) {
        nodes { id variantId sellingPlanName }
      }
    }
  }
`;

export interface ContractLine {
  contractId: string;
  lineId: string;
  variantId: string | null;
}

/** Reads a subscription contract's first line directly (from a contract gid). */
export async function getContractFirstLine(contractGid: string): Promise<ContractLine | null> {
  const data = await shopifyAdminGraphql<{
    subscriptionContract: {
      id: string;
      lines: { nodes: Array<{ id: string; variantId: string | null }> };
    } | null;
  }>(CONTRACT_QUERY, { id: contractGid });

  const line = data.subscriptionContract?.lines.nodes[0];
  if (!data.subscriptionContract?.id || !line?.id) return null;
  return { contractId: data.subscriptionContract.id, lineId: line.id, variantId: line.variantId };
}

/**
 * Swaps a subscription line's variant to the real kibble-pack bag and sets its
 * recurring price, so renewals ship the correct SKU at the discounted price.
 * Keeps the contract Shopify-native (no RecurPay API, no customer email).
 */
export async function swapSubscriptionProduct(
  contractId: string,
  lineId: string,
  realVariantId: number,
  price: number,
): Promise<void> {
  const data = await shopifyAdminGraphql<{
    subscriptionContractProductChange: {
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(PRODUCT_CHANGE, {
    contractId,
    lineId,
    variantId: `gid://shopify/ProductVariant/${realVariantId}`,
    price,
  });

  const errors = data.subscriptionContractProductChange.userErrors;
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }
}

export async function tagOrderProcessed(orderId: number): Promise<void> {
  await shopifyAdminGraphql(ADD_ORDER_TAG, {
    id: `gid://shopify/Order/${orderId}`,
    tags: ['sample_subscribe_processed'],
  });
}

export async function orderHasProcessedTag(orderId: number): Promise<boolean> {
  const data = await shopifyAdminGraphql<{
    order: { tags: string[] } | null;
  }>(`
    query OrderTags($id: ID!) {
      order(id: $id) { tags }
    }
  `, { id: `gid://shopify/Order/${orderId}` });

  const tags = data.order?.tags ?? [];
  return tags.includes('sample_subscribe_processed');
}
