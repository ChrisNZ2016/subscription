import crypto from 'crypto';

interface MetaLineItem {
  variant_id: number | null;
}

interface MetaPurchaseOrder {
  id: number;
  email: string | null;
  total_price: string;
  currency: string;
  created_at: string;
  line_items: MetaLineItem[];
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

function noteAttr(attrs: Array<{ name: string; value: string }>, key: string): string | undefined {
  return attrs.find((a) => a.name === key)?.value;
}

export async function sendMetaPurchase(
  order: MetaPurchaseOrder,
  noteAttributes: Array<{ name: string; value: string }>,
): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;

  const eventId = noteAttr(noteAttributes, '_meta_purchase_event_id') ?? `order-${order.id}`;
  const fbp = noteAttr(noteAttributes, '_fbp');
  const fbc = noteAttr(noteAttributes, '_fbc');

  const userData: Record<string, string | string[]> = {};
  if (order.email) userData.em = [hashEmail(order.email)];
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const contentIds = order.line_items
    .map((item) => item.variant_id)
    .filter((id): id is number => id != null)
    .map(String);

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(new Date(order.created_at).getTime() / 1000),
        event_id: eventId,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          value: parseFloat(order.total_price),
          currency: order.currency,
          content_ids: contentIds,
          content_type: 'product',
          order_id: String(order.id),
        },
      },
    ],
  };

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta CAPI Purchase failed (${response.status}): ${body}`);
  }
}
