import { useState } from 'react';
import {
  createCartAndRedirect,
  type SubscriptionSelection,
  type AddonSelection,
} from '../lib/cart';

interface UseCartReturn {
  submit: (
    sampleVariantId: string,
    sampleSellingPlanId: string | null | undefined,
    subscription: SubscriptionSelection,
    addons: AddonSelection[],
    subscriptionPrice?: string,
    dogSize?: string,
  ) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function useCart(): UseCartReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(
    sampleVariantId: string,
    sampleSellingPlanId: string | null | undefined,
    subscription: SubscriptionSelection,
    addons: AddonSelection[],
    subscriptionPrice?: string,
    dogSize?: string,
  ) {
    setIsSubmitting(true);
    setError(null);
    try {
      await createCartAndRedirect(sampleVariantId, sampleSellingPlanId, subscription, addons, subscriptionPrice, dogSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }

  return { submit, isSubmitting, error };
}
