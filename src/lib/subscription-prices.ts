export interface SubscriptionPriceRow {
  bagSizeKg: number;
  price: string;
}

export const SUBSCRIPTION_PRICES: SubscriptionPriceRow[] = [
  { bagSizeKg: 2, price: '$44.00' },
  { bagSizeKg: 4, price: '$88.00' },
  { bagSizeKg: 6, price: '$105.60' },
  { bagSizeKg: 8, price: '$140.00' },
  { bagSizeKg: 12, price: '$160.00' },
  { bagSizeKg: 24, price: '$320.00' },
];
