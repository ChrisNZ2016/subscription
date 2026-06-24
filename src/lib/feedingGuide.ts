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

export function parseVariantBagKg(title: string): number {
  return parseInt(title, 10) || 0;
}

export const VARIANT_SORT_ORDER = ['2kg', '4kg', '6kg', '8kg', '12kg', '24kg'];
