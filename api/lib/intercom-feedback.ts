const INTERCOM_VERSION = '2.16';
const INTERCOM_API = 'https://api.intercom.io';
const SUBMISSION_ATTR = 'lgd_feedback_submission_id';
const CONVERSATION_ATTR = 'lgd_feedback_conversation_id';

type IntercomContact = {
  id: string;
  role?: string;
  custom_attributes?: Record<string, unknown>;
};

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Intercom-Version': INTERCOM_VERSION,
  };
}

async function intercomFetch(
  token: string,
  path: string,
  method: 'POST' | 'PUT',
  body: unknown,
): Promise<Response> {
  const res = await fetch(`${INTERCOM_API}${path}`, {
    method,
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Intercom ${method} ${path} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res;
}

async function findContactByEmail(token: string, email: string): Promise<IntercomContact | null> {
  const res = await intercomFetch(token, '/contacts/search', 'POST', {
    query: { field: 'email', operator: '=', value: email },
    pagination: { per_page: 1 },
  });
  const payload = (await res.json()) as { data?: IntercomContact[] };
  return payload.data?.[0] ?? null;
}

async function createContact(token: string, email: string): Promise<IntercomContact> {
  const res = await intercomFetch(token, '/contacts', 'POST', { role: 'user', email });
  return (await res.json()) as IntercomContact;
}

async function upsertContact(token: string, email: string): Promise<IntercomContact> {
  const existing = await findContactByEmail(token, email);
  if (existing) return existing;
  try {
    return await createContact(token, email);
  } catch (err) {
    // A parallel request can create the contact first; search again.
    const raced = await findContactByEmail(token, email);
    if (raced) return raced;
    throw err;
  }
}

function storedThreadId(contact: IntercomContact, submissionId: string): string {
  const attrs = contact.custom_attributes ?? {};
  if (String(attrs[SUBMISSION_ATTR] ?? '') !== submissionId) return '';
  return String(attrs[CONVERSATION_ATTR] ?? '');
}

async function rememberConversation(
  token: string,
  contact: IntercomContact,
  submissionId: string,
  conversationId: string,
): Promise<void> {
  await intercomFetch(token, `/contacts/${contact.id}`, 'PUT', {
    custom_attributes: {
      [SUBMISSION_ATTR]: submissionId,
      [CONVERSATION_ATTR]: conversationId,
    },
  });
}

async function createConversation(
  token: string,
  contact: IntercomContact,
  body: string,
): Promise<string> {
  const res = await intercomFetch(token, '/conversations', 'POST', {
    from: { type: contact.role === 'lead' ? 'lead' : 'user', id: contact.id },
    body,
  });
  const payload = (await res.json()) as { conversation_id?: string };
  if (!payload.conversation_id) {
    throw new Error('Intercom create conversation: missing conversation_id');
  }
  return payload.conversation_id;
}

async function replyAsContact(
  token: string,
  contactId: string,
  conversationId: string,
  body: string,
): Promise<void> {
  await intercomFetch(token, `/conversations/${conversationId}/reply`, 'POST', {
    message_type: 'comment',
    type: 'user',
    intercom_user_id: contactId,
    body,
  });
}

export function buildIntercomMessage(input: {
  page: string;
  reasonLabels: string[];
  comment: string;
  message: string;
}): string {
  const parts = [
    input.page === 'keep-going'
      ? 'Question from keep-going page'
      : 'Feedback from get-feedback page',
  ];
  if (input.reasonLabels.length > 0) {
    parts.push(`Reasons: ${input.reasonLabels.join(', ')}`);
  }
  if (input.message) parts.push(input.message);
  if (input.comment) parts.push(input.comment);
  return parts.join('\n\n').trim();
}

/**
 * Opens (or updates) an Intercom inbox conversation as the customer.
 * Same submission id replies on the existing thread instead of opening a second one.
 */
export async function upsertIntercomFeedback(input: {
  token: string;
  email: string;
  submissionId: string;
  body: string;
}): Promise<void> {
  const contact = await upsertContact(input.token, input.email);
  const threadId = storedThreadId(contact, input.submissionId);
  if (threadId) {
    await replyAsContact(input.token, contact.id, threadId, input.body);
    return;
  }

  const conversationId = await createConversation(input.token, contact, input.body);
  try {
    await rememberConversation(input.token, contact, input.submissionId, conversationId);
  } catch (err) {
    // Conversation is already in the inbox; attributes are only for dedupe.
    console.error('Intercom contact attribute update failed', err);
  }
}
