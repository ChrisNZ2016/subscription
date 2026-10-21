/**
 * Australian pricing for the demand test at lp.littlegreen-dog.com.
 *
 * The AU page never talks to Shopify. There is no AU stock to sell — the CTA
 * goes to a sold-out waitlist page — so every figure here is a static price
 * from the AU pricing sheet rather than a Storefront API variant.
 *
 * Changing any number below changes what the test measures: bump `solo-au` in
 * src/constants/page-versions.ts so conversion data from before and after the
 * change stays tellable apart.
 */

/** Drops the cents on whole dollars, so the table reads A$54, not A$54.00. */
function formatAud(amount: number): string {
  return `A$${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;
}

/** The 2kg sample, delivered. Shipping is included in this price. */
export const AU_SAMPLE_AMOUNT = 24.95;
/** Anchor for the sample discount: the 2kg bag at full AU retail. */
export const AU_SAMPLE_COMPARE_AT_AMOUNT = 54;

export const AU_SAMPLE_PRICE = formatAud(AU_SAMPLE_AMOUNT);
export const AU_SAMPLE_COMPARE_AT = formatAud(AU_SAMPLE_COMPARE_AT_AMOUNT);

export const AU_SAMPLE_PERCENT_OFF = Math.round(
  (1 - AU_SAMPLE_AMOUNT / AU_SAMPLE_COMPARE_AT_AMOUNT) * 100,
);
export const AU_SAMPLE_DISCOUNT_LABEL = `${AU_SAMPLE_PERCENT_OFF}% off`;

export interface AuSubscriptionPriceRow {
  bagSizeKg: number;
  retail: string;
  subscription: string;
  /** Subscription price per kg — the reason the bigger bags are worth showing. */
  perKg: string;
  percentOffRetail: number;
}

/** [bag size kg, retail AUD, subscription AUD] from the AU pricing sheet. */
const AU_PRICE_SHEET: Array<[number, number, number]> = [
  [2, 54, 48],
  [4, 96, 86],
  [6, 120, 105],
  [8, 139, 122],
  [12, 189, 165],
  [24, 360, 306],
];

export const AU_SUBSCRIPTION_PRICES: AuSubscriptionPriceRow[] = AU_PRICE_SHEET.map(
  ([bagSizeKg, retail, subscription]) => ({
    bagSizeKg,
    retail: formatAud(retail),
    subscription: formatAud(subscription),
    perKg: `A$${(subscription / bagSizeKg).toFixed(2)}`,
    percentOffRetail: Math.round((1 - subscription / retail) * 100),
  }),
);
