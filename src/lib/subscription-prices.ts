export interface SubscriptionPriceRow {
  bagSizeKg: number;
  price: string;
}

export const SUBSCRIPTION_PRICES: SubscriptionPriceRow[] = [
  { bagSizeKg: 2, price: '$44.00' },
  { bagSizeKg: 4, price: '$76.80' },
  { bagSizeKg: 6, price: '$100.80' },
  { bagSizeKg: 8, price: '$118.40' },
  { bagSizeKg: 12, price: '$158.40' },
  { bagSizeKg: 24, price: '$280.00' },
];
