/**
 * Which storefront this build serves.
 *
 * The NZ funnel (lp.littlegreendog.co.nz) and the Australian demand test
 * (lp.littlegreen-dog.com) ship from this one repo but deploy as two separate
 * Vercel projects, each holding its own env values. That is what keeps the AU
 * test on its own Meta pixel and Mixpanel project: the values are baked in at
 * build time, so nothing has to sniff the hostname at runtime.
 *
 * `VITE_SITE=au` makes a build serve the AU pages only — the NZ funnels are not
 * routable on the AU domain, so paid AU traffic can never wander into a page
 * that sells NZ stock at NZ prices.
 */
export type Site = 'nz' | 'au';

export const SITE: Site =
  (import.meta.env.VITE_SITE as string | undefined)?.trim().toLowerCase() === 'au' ? 'au' : 'nz';

export function isAuSite(): boolean {
  return SITE === 'au';
}
