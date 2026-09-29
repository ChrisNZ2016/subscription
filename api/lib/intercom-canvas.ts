/**
 * Intercom Canvas Kit primitives (types, component builders, request helpers).
 *
 * Used by the Intercom Details panel endpoints (see docs/intercom-subscription-panel.md):
 *   POST /api/intercom/initialize
 *   POST /api/intercom/submit
 *
 * Pure module: no I/O and no env access. The caller passes the app client secret
 * (INTERCOM_CANVAS_CLIENT_SECRET) into verifyIntercomSignature().
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export type TextStyle = 'header' | 'paragraph' | 'muted' | 'error';
export type ButtonStyle = 'primary' | 'secondary' | 'link';
export type SpacerSize = 'xs' | 's' | 'm' | 'l' | 'xl';

export type TextComponent = {
  type: 'text';
  text: string;
  style?: TextStyle;
  align?: 'left' | 'center' | 'right';
  bottom_margin?: 'none';
};

export type FieldValue = { type: 'field-value'; field: string; value: string };

export type DataTableComponent = { type: 'data-table'; items: FieldValue[] };

export type ButtonAction = { type: 'submit' } | { type: 'url'; url: string };

export type ButtonComponent = {
  type: 'button';
  id: string;
  label: string;
  style?: ButtonStyle;
  disabled?: boolean;
  action: ButtonAction;
};

export type DividerComponent = { type: 'divider' };
export type SpacerComponent = { type: 'spacer'; size?: SpacerSize };

export type CanvasComponent =
  | TextComponent
  | DataTableComponent
  | ButtonComponent
  | DividerComponent
  | SpacerComponent;

export type CanvasResponse = {
  canvas: {
    content: { components: CanvasComponent[] };
    stored_data?: Record<string, unknown>;
  };
};

export type TextOptions = {
  style?: TextStyle;
  align?: 'left' | 'center' | 'right';
  bottomMargin?: 'none';
};

export function text(content: string, options: TextOptions = {}): TextComponent {
  const c: TextComponent = { type: 'text', text: content };
  if (options.style) c.style = options.style;
  if (options.align) c.align = options.align;
  if (options.bottomMargin) c.bottom_margin = options.bottomMargin;
  return c;
}

/** Rows whose value is undefined, null or blank are skipped. */
export function dataTable(
  rows: ReadonlyArray<readonly [field: string, value: string | undefined | null]>,
): DataTableComponent {
  const items: FieldValue[] = [];
  for (const [field, value] of rows) {
    if (value === undefined || value === null) continue;
    if (value.trim() === '') continue;
    items.push({ type: 'field-value', field, value });
  }
  return { type: 'data-table', items };
}

export function submitButton(id: string, label: string, style: ButtonStyle = 'secondary'): ButtonComponent {
  return { type: 'button', id, label, style, action: { type: 'submit' } };
}

export function urlButton(
  id: string,
  label: string,
  url: string,
  style: ButtonStyle = 'secondary',
): ButtonComponent {
  return { type: 'button', id, label, style, action: { type: 'url', url } };
}

export function divider(): DividerComponent {
  return { type: 'divider' };
}

export function spacer(size?: SpacerSize): SpacerComponent {
  return size ? { type: 'spacer', size } : { type: 'spacer' };
}

export function canvas(components: CanvasComponent[], storedData?: Record<string, unknown>): CanvasResponse {
  const out: CanvasResponse = { canvas: { content: { components } } };
  if (storedData) out.canvas.stored_data = storedData;
  return out;
}

const HEX = /^[0-9a-f]+$/i;

/**
 * Verifies the X-Body-Signature header: HMAC of the RAW request body keyed with the
 * app client secret, hex encoded. Intercom's docs say HMAC-SHA256 but their example
 * header is 40 hex chars (SHA-1 length), so the algorithm is chosen by header length:
 * 64 = sha256, 40 = sha1, anything else is rejected.
 */
export function verifyIntercomSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  clientSecret: string | undefined,
): boolean {
  try {
    if (!clientSecret || !signatureHeader) return false;
    const sig = signatureHeader.trim();
    if (!HEX.test(sig)) return false;
    const algorithm = sig.length === 64 ? 'sha256' : sig.length === 40 ? 'sha1' : undefined;
    if (!algorithm) return false;
    const expected = createHmac(algorithm, clientSecret).update(rawBody).digest();
    const received = Buffer.from(sig, 'hex');
    if (received.length !== expected.length) return false;
    return timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? undefined : t;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

/** Intercom's docs disagree on `contact` vs `customer`; accept both. */
export function readContact(body: unknown): { email?: string; name?: string; id?: string } {
  if (!isRecord(body)) return {};
  const raw = body.contact ?? body.customer;
  if (!isRecord(raw)) return {};
  const out: { email?: string; name?: string; id?: string } = {};
  const email = asString(raw.email);
  const name = asString(raw.name);
  const id = asString(raw.id);
  if (email) out.email = email;
  if (name) out.name = name;
  if (id) out.id = id;
  return out;
}

export function readAdmin(body: unknown): { id?: string; name?: string } {
  if (!isRecord(body) || !isRecord(body.admin)) return {};
  const out: { id?: string; name?: string } = {};
  const id = asString(body.admin.id);
  const name = asString(body.admin.name);
  if (id) out.id = id;
  if (name) out.name = name;
  return out;
}

export function readConversationId(body: unknown): string | undefined {
  if (!isRecord(body) || !isRecord(body.conversation)) return undefined;
  return asString(body.conversation.id);
}
