import { lazy, Suspense, useEffect } from 'react'
import { getLandingVariant } from './lib/page-attribution'
import { getEmailFromSearch } from './lib/email-from-url'

const LandingPage = lazy(() => import('./components/LandingPage').then((m) => ({ default: m.LandingPage })))
const SoloPage = lazy(() => import('./components/SoloPage').then((m) => ({ default: m.SoloPage })))
const SampleSubscribePage = lazy(() => import('./components/SampleSubscribePage').then((m) => ({ default: m.SampleSubscribePage })))
const ReactivationPage = lazy(() => import('./components/ReactivationPage').then((m) => ({ default: m.ReactivationPage })))
const SubscribePage = lazy(() => import('./components/SubscribePage').then((m) => ({ default: m.SubscribePage })))
const SubscribeIngredientsPage = lazy(() => import('./components/SubscribeIngredientsPage').then((m) => ({ default: m.SubscribeIngredientsPage })))
const WholesalePage = lazy(() => import('./components/WholesalePage').then((m) => ({ default: m.WholesalePage })))
const KeepGoingPage = lazy(() => import('./components/KeepGoingPage').then((m) => ({ default: m.KeepGoingPage })))
const GetFeedbackPage = lazy(() => import('./components/GetFeedbackPage').then((m) => ({ default: m.GetFeedbackPage })))

function resolvePage() {
  const path = window.location.pathname;
  if (path === '/solo' || path === '/solo/') {
    return <SoloPage />;
  }
  if (path === '/sample-subscribe' || path === '/sample-subscribe/') return <SampleSubscribePage />;
  if (path === '/welcome-back' || path === '/welcome-back/') return <ReactivationPage />;
  if (path === '/subscribe-offer' || path === '/subscribe-offer/') return <SubscribePage />;
  if (path === '/subscribe-ingredients' || path === '/subscribe-ingredients/') return <SubscribeIngredientsPage />;
  if (path === '/wholesale' || path === '/wholesale/') return <WholesalePage />;
  if (path === '/keep-going' || path === '/keep-going/') return <KeepGoingPage />;
  if (path === '/get-feedback' || path === '/get-feedback/') return <GetFeedbackPage />;
  // Root defaults to the solo funnel; `?variant=simple|solo` still opts into the
  // older LandingPage funnel. Keep in step with getPageName() in page-attribution.
  return getLandingVariant() ? <LandingPage /> : <SoloPage />;
}

function App() {
  useEffect(() => {
    void import('@intercom/messenger-js-sdk').then(({ default: Intercom }) => {
      const email = getEmailFromSearch();
      Intercom({
        app_id: 'argvrv71',
        ...(email ? { email } : {}),
      });
    });
  }, []);

  return <Suspense fallback={null}>{resolvePage()}</Suspense>;
}

export default App
