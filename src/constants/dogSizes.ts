export interface DogSizePreset {
  label: string;
  description: string;
  bagWeight: number;
  frequencyWeeks: number;
}

export const DOG_SIZE_PRESETS: DogSizePreset[] = [
  { label: 'Small', description: 'Up to 10kg', bagWeight: 2, frequencyWeeks: 4 },
  { label: 'Medium', description: '10–25kg', bagWeight: 6, frequencyWeeks: 4 },
  { label: 'Large', description: '25kg+', bagWeight: 8, frequencyWeeks: 4 },
];

export const BAG_WEIGHT_OPTIONS = [2, 4, 6, 8] as const;

export const FREQUENCY_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
