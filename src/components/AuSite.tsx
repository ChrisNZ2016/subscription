import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  AU_LANDING_PATH,
  AU_SOLD_OUT_PATH,
  isSoldOutPath,
  withSearch,
} from '../lib/au-routes';

const SoloAuPage = lazy(() =>
  import('./SoloAuPage').then((m) => ({ default: m.SoloAuPage })),
);
const SoldOutPage = lazy(() =>
  import('./SoldOutPage').then((m) => ({ default: m.SoldOutPage })),
);

/**
 * The two-page Australian demand test.
 *
 * Moves between the landing page and the sold-out page with pushState rather
 * than a document navigation, for two reasons: the Meta Lead fired on the CTA
 * click can't be cut off mid-flight by a page unload, and the campaign's query
 * string survives the hop so the waitlist signup keeps its UTMs. A direct hit
 * on /sold-out still renders the right page, since the view is read from the
 * live pathname.
 */
export function AuSite() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const url = withSearch(to);
    window.history.pushState({}, '', url);
    setPath(to);
    window.scrollTo({ top: 0 });
  }, []);

  const goToSoldOut = useCallback(() => navigate(AU_SOLD_OUT_PATH), [navigate]);
  const goToLanding = useCallback(() => navigate(AU_LANDING_PATH), [navigate]);

  return (
    <Suspense fallback={null}>
      {isSoldOutPath(path) ? (
        <SoldOutPage onBack={goToLanding} />
      ) : (
        <SoloAuPage onSoldOut={goToSoldOut} />
      )}
    </Suspense>
  );
}
