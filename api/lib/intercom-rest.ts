/**
 * Minimal Intercom REST client for the RecurPay Canvas card.
 *
 * Env: INTERCOM_ACCESS_TOKEN (needs conversations write access to add notes).
 */
import { escapeHtml } from './addon-html-escape.js';

const INTERCOM_VERSION = '2.16';
const INTERCOM_API = 'https://api.intercom.io';

function readToken(): string | undefined {
  const value = process.env.INTERCOM_ACCESS_TOKEN?.trim();
  if (!value || value.length < 20 || value.startsWith('[')) return undefined;
  return value;
}

/**
 * Adds an internal (teammate-only) note to a conversation.
 * The note is an audit extra: a missing token logs a warning and returns,
 * it never blocks the order result. A non-2xx response throws.
 */
export async function addConversationNote(
  conversationId: string,
  adminId: string,
  text: string,
): Promise<void> {
  const token = readToken();
  if (!token) {
    console.warn('INTERCOM_ACCESS_TOKEN not set; skipping conversation note');
    return;
  }

  const html = `<p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p>`;
  const path = `/conversations/${encodeURIComponent(conversationId)}/reply`;
  const res = await fetch(`${INTERCOM_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Intercom-Version': INTERCOM_VERSION,
    },
    body: JSON.stringify({
      message_type: 'note',
      type: 'admin',
      admin_id: adminId,
      body: html,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Intercom POST ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  }
}
