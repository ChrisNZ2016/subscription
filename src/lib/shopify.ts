import type { Product } from '../types/shopify';

const DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || '2025-01';

const endpoint = `https://${DOMAIN}/api/${API_VERSION}/graphql.json`;

export async function storefrontQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Storefront API error: ${res.status}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join(', '));
  }

  return json.data as T;
}

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    title
    handle
    description
    images(first: 3) {
      nodes {
        url
        altText
      }
    }
    variants(first: 10) {
      nodes {
        id
        title
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        sellingPlanAllocations(first: 10) {
          nodes {
            sellingPlan {
              id
              name
            }
            priceAdjustments {
              compareAtPrice {
                amount
                currencyCode
              }
              perDeliveryPrice {
                amount
                currencyCode
              }
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
    sellingPlanGroups(first: 5) {
      nodes {
        name
        sellingPlans(first: 10) {
          nodes {
            id
            name
            priceAdjustments {
              adjustmentValue {
                __typename
                ... on SellingPlanPercentagePriceAdjustment {
                  adjustmentPercentage
                }
                ... on SellingPlanFixedAmountPriceAdjustment {
                  adjustmentAmount {
                    amount
                    currencyCode
                  }
                }
                ... on SellingPlanFixedPriceAdjustment {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchProduct(handle: string): Promise<Product> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        ...ProductFields
      }
    }
  `;

  const data = await storefrontQuery<{ productByHandle: Product }>(query, { handle });

  if (!data.productByHandle) {
    throw new Error(`Product not found: ${handle}`);
  }

  return data.productByHandle;
}

export async function fetchMultipleProducts(handles: string[]): Promise<Product[]> {
  const results = await Promise.all(
    handles.map((handle) => fetchProduct(handle).catch(() => null)),
  );
  return results.filter((p): p is Product => p !== null);
}
