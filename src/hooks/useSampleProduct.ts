import { useEffect, useState } from 'react';
import { fetchProduct } from '../lib/shopify';
import type { Product } from '../types/shopify';

const SAMPLE_HANDLE = import.meta.env.VITE_SAMPLE_PRODUCT_HANDLE || 'sample-2kg';

export function useSampleProduct() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProduct(SAMPLE_HANDLE)
      .then(setProduct)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, []);

  return { product, loading, error };
}
