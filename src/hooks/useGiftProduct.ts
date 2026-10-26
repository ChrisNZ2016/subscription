import { useEffect, useState } from 'react';
import { fetchProduct } from '../lib/shopify';
import { BF_GIFT_PRODUCT_HANDLE } from '../lib/black-friday-plans';
import type { Product } from '../types/shopify';

/** The poop bag product the Black Friday gift line comes from. */
export function useGiftProduct() {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProduct(BF_GIFT_PRODUCT_HANDLE)
      .then(setProduct)
      .catch(() => setProduct(null));
  }, []);

  return product;
}
