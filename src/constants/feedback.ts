export const FEEDBACK_NOTIFY_EMAIL = 'hello@littlegreendog.co.nz';

export type FeedbackPage = 'keep-going' | 'get-feedback';

export const FEEDBACK_REASONS = [
  { id: 'cost', label: 'Cost' },
  { id: 'consumption', label: 'Hard to estimate consumption' },
  { id: 'taste', label: "Dog doesn't like the food" },
  { id: 'allergies', label: "Allergy symptoms haven't improved" },
] as const;

export type FeedbackReasonId = (typeof FEEDBACK_REASONS)[number]['id'];
