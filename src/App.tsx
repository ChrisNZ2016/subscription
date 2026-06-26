import { lazy, Suspense } from 'react'

const LandingPage = lazy(() => import('./components/LandingPage').then((m) => ({ default: m.LandingPage })))
const SoloPage = lazy(() => import('./components/SoloPage').then((m) => ({ default: m.SoloPage })))
const ReactivationPage = lazy(() => import('./components/ReactivationPage').then((m) => ({ default: m.ReactivationPage })))
const SubscribePage = lazy(() => import('./components/SubscribePage').then((m) => ({ default: m.SubscribePage })))
const SubscribeIngredientsPage = lazy(() => import('./components/SubscribeIngredientsPage').then((m) => ({ default: m.SubscribeIngredientsPage })))
const WholesalePage = lazy(() => import('./components/WholesalePage').then((m) => ({ default: m.WholesalePage })))

function resolvePage() {
  const path = window.location.pathname;
  if (path === '/solo' || path === '/solo/') return <SoloPage />;
  if (path === '/welcome-back' || path === '/welcome-back/') return <ReactivationPage />;
  if (path === '/subscribe-offer' || path === '/subscribe-offer/') return <SubscribePage />;
  if (path === '/subscribe-ingredients' || path === '/subscribe-ingredients/') return <SubscribeIngredientsPage />;
  if (path === '/wholesale' || path === '/wholesale/') return <WholesalePage />;
  return <LandingPage />;
}

function App() {
  return <Suspense fallback={null}>{resolvePage()}</Suspense>;
}

export default App
