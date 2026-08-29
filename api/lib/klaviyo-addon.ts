import { campaignUrl, klaviyoLinkProperty, parseCampaigns } from './addon-campaigns.js';

const KLAVIYO_REVISION = '2024-10-15';

interface KlaviyoWriteInput {
  email: string;
  subscriptionId: number;
  sig: string;
  tokenUrl: string;
}

/**
 * Upserts the durable one-click properties onto a Klaviyo profile so emails
 * can use merge tags instead of a pre-baked token. Writes sid+sig plus a
 * prebuilt URL for every configured campaign so one webhook covers both pack sizes.
 */
export async function writeKlaviyoAddonLink(input: KlaviyoWriteInput): Promise<void> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) return;

  const properties: Record<string, string | number> = {
    recurpay_subscription_id: input.subscriptionId,
    recurpay_link_sig: input.sig,
    addon_link_token_url: input.tokenUrl,
  };
  for (const campaign of parseCampaigns()) {
    properties[klaviyoLinkProperty(campaign.slug)] = campaignUrl(
      campaign.slug,
      input.subscriptionId,
      input.sig,
    );
  }

  const res = await fetch('https://a.klaviyo.com/api/profile-import', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_REVISION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'profile',
        attributes: {
          email: input.email,
          properties,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Klaviyo profile-import ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
