export interface SubscriptionPriceRow {
  bagSizeKg: number;
  price: string;
}

export const SUBSCRIPTION_PRICES: SubscriptionPriceRow[] = [
  { bagSizeKg: 2, price: '$44.00' },
  { bagSizeKg: 4, price: '$65.60' },
  { bagSizeKg: 6, price: '$83.20' },
  { bagSizeKg: 8, price: '$99.20' },
  { bagSizeKg: 12, price: '$132.00' },
  { bagSizeKg: 24, price: '$212.00' },
];
