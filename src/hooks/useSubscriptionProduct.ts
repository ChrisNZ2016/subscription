import { useEffect, useState } from 'react';
import { fetchProduct } from '../lib/shopify';
import type { Product } from '../types/shopify';

const SUBSCRIPTION_HANDLE =
  import.meta.env.VITE_SUBSCRIPTION_PRODUCT_HANDLE || 'kibble-pack';

export function useSubscriptionProduct() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProduct(SUBSCRIPTION_HANDLE)
      .then(setProduct)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, []);

  return { product, loading, error };
}
