export interface DogWeightRange {
  id: string;
  label: string;
  bagSizeKg: number;
}

export const DOG_WEIGHT_RANGES: DogWeightRange[] = [
  { id: '1-2', label: '1–2 kg', bagSizeKg: 2 },
  { id: '2-5', label: '2–5 kg', bagSizeKg: 4 },
  { id: '5-10', label: '5–10 kg', bagSizeKg: 6 },
  { id: '10-20', label: '10–20 kg', bagSizeKg: 8 },
  { id: '20-30', label: '20–30 kg', bagSizeKg: 12 },
  { id: '30+', label: '30+ kg', bagSizeKg: 24 },
];

export function getBagSizeForWeightRange(rangeId: string): number {
  return DOG_WEIGHT_RANGES.find((r) => r.id === rangeId)?.bagSizeKg ?? 2;
}

/** Midpoint weight (kg) for a range id, used in feeding calculations. */
export function getRepresentativeWeightKg(rangeId: string): number {
  const range = DOG_WEIGHT_RANGES.find((r) => r.id === rangeId);
  if (!range) return 5;
  if (range.id === '30+') return 35;
  const [lowStr, highStr] = range.label.replace(/\s*kg\s*/gi, '').split('–');
  const low = parseFloat(lowStr);
  const high = highStr ? parseFloat(highStr) : low * 2;
  if (Number.isNaN(low)) return 5;
  if (Number.isNaN(high) || !highStr) return low;
  return (low + high) / 2;
}

const FEEDING_TABLE: Array<{ kg: number; lowG: number; highG: number }> = [
  { kg: 1, lowG: 27, highG: 31 },
  { kg: 2, lowG: 45, highG: 52 },
  { kg: 3, lowG: 61, highG: 72 },
  { kg: 4, lowG: 75, highG: 89 },
  { kg: 5, lowG: 89, highG: 105 },
  { kg: 7.5, lowG: 122, highG: 143 },
  { kg: 10, lowG: 150, highG: 177 },
  { kg: 15, lowG: 204, highG: 240 },
  { kg: 20, lowG: 254, highG: 298 },
  { kg: 25, lowG: 299, highG: 352 },
  { kg: 30, lowG: 343, highG: 404 },
];

/** Daily grams from dog weight; uses table interpolation and low/high midpoint. */
export function estimateDailyGrams(dogWeightKg: number): number {
  if (dogWeightKg <= FEEDING_TABLE[0].kg) {
    const row = FEEDING_TABLE[0];
    return (row.lowG + row.highG) / 2;
  }
  for (let i = 1; i < FEEDING_TABLE.length; i++) {
    const prev = FEEDING_TABLE[i - 1];
    const curr = FEEDING_TABLE[i];
    if (dogWeightKg <= curr.kg) {
      const t = (dogWeightKg - prev.kg) / (curr.kg - prev.kg);
      const lowG = prev.lowG + t * (curr.lowG - prev.lowG);
      const highG = prev.highG + t * (curr.highG - prev.highG);
      return (lowG + highG) / 2;
    }
  }
  const last = FEEDING_TABLE[FEEDING_TABLE.length - 1];
  return (last.lowG + last.highG) / 2;
}

const FREQUENCY_MONTHS = [1, 2, 3] as const;
const DAYS_PER_MONTH = 30;

/** How many days a bag of the given size lasts at the estimated daily intake. */
export function estimateBagDurationDays(bagSizeKg: number, dailyGrams: number): number {
  return (bagSizeKg * 1000) / dailyGrams;
}

/** Closest 1/2/3-month interval (30-day multiples) to one bag's duration at this weight + bag size. */
export function suggestFrequencyMonths(bagSizeKg: number, dogWeightKg: number): 1 | 2 | 3 {
  const dailyGrams = estimateDailyGrams(dogWeightKg);
  const bagDays = estimateBagDurationDays(bagSizeKg, dailyGrams);
  let best: 1 | 2 | 3 = 1;
  let bestDiff = Infinity;
  for (const months of FREQUENCY_MONTHS) {
    const diff = Math.abs(bagDays - months * DAYS_PER_MONTH);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = months;
    }
  }
  return best;
}

/** Suggested bag size (from weight range) and billing frequency (from feeding model). */
export function suggestSampleSubscribePlan(rangeId: string): {
  bagSizeKg: number;
  frequencyMonths: 1 | 2 | 3;
} {
  const bagSizeKg = getBagSizeForWeightRange(rangeId);
  const dogWeightKg = getRepresentativeWeightKg(rangeId);
  const frequencyMonths = suggestFrequencyMonths(bagSizeKg, dogWeightKg);
  return { bagSizeKg, frequencyMonths };
}

export function parseVariantBagKg(title: string): number {
  return parseInt(title, 10) || 0;
}

export const VARIANT_SORT_ORDER = ['2kg', '4kg', '6kg', '8kg', '12kg', '24kg'];
