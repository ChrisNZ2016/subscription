/**
 * Loads a contact's RecurPay subscriptions and builds the panel card.
 * Shared by /api/intercom/initialize and the refresh / back / show_all paths of
 * /api/intercom/submit so both always render the same thing.
 *
 * Env: RECURPAY_ADMIN_URL_TEMPLATE (optional), plus the RecurPay vars used by recurpay.ts.
 */
import type { CanvasResponse } from './intercom-canvas.js';
import { listSubscriptionsByEmail } from './recurpay.js';
import {
  buildErrorCard,
  buildNoEmailCard,
  buildNoSubscriptionsCard,
  buildSubscriptionCard,
} from './subscription-panel.js';

/** Log-safe form of an email: domain only. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : 'unknown';
}

export async function loadSubscriptionCard(
  email: string | undefined,
  options: { showAll?: boolean; now?: Date } = {},
): Promise<CanvasResponse> {
  if (!email) return buildNoEmailCard();

  let subscriptions;
  try {
    subscriptions = await listSubscriptionsByEmail(email);
  } catch (err) {
    console.error(
      `RecurPay lookup failed (email domain ${emailDomain(email)}):`,
      err instanceof Error ? err.message : String(err),
    );
    return buildErrorCard("Couldn't reach RecurPay just now.");
  }

  if (subscriptions.length === 0) return buildNoSubscriptionsCard(email);

  return buildSubscriptionCard({
    email,
    subscriptions,
    showAll: options.showAll === true,
    adminUrlTemplate: process.env.RECURPAY_ADMIN_URL_TEMPLATE?.trim() || undefined,
    now: options.now ?? new Date(),
  });
}
