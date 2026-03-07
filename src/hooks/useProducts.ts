import { useEffect, useState } from 'react';
import { fetchProduct, fetchMultipleProducts } from '../lib/shopify';
import type { Product } from '../types/shopify';

const SAMPLE_HANDLE = import.meta.env.VITE_SAMPLE_PRODUCT_HANDLE || 'sample-2kg';
const SUBSCRIPTION_HANDLE = import.meta.env.VITE_SUBSCRIPTION_PRODUCT_HANDLE || '';
const ADDON_HANDLES = (import.meta.env.VITE_ADDON_HANDLES || '')
  .split(',')
  .map((h: string) => h.trim())
  .filter(Boolean);

interface UseProductsReturn {
  sampleProduct: Product | null;
  subscriptionProduct: Product | null;
  addonProducts: Product[];
  loading: boolean;
  error: string | null;
}

export function useProducts(): UseProductsReturn {
  const [sampleProduct, setSampleProduct] = useState<Product | null>(null);
  const [subscriptionProduct, setSubscriptionProduct] = useState<Product | null>(null);
  const [addonProducts, setAddonProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [sample, subscription, addons] = await Promise.all([
          fetchProduct(SAMPLE_HANDLE),
          SUBSCRIPTION_HANDLE
            ? fetchProduct(SUBSCRIPTION_HANDLE).catch(() => null)
            : Promise.resolve(null),
          ADDON_HANDLES.length > 0
            ? fetchMultipleProducts(ADDON_HANDLES)
            : Promise.resolve([]),
        ]);
        setSampleProduct(sample);
        setSubscriptionProduct(subscription);
        setAddonProducts(addons);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { sampleProduct, subscriptionProduct, addonProducts, loading, error };
}
