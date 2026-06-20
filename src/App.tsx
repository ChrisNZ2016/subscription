import { LandingPage } from './components/LandingPage'
import { SoloPage } from './components/SoloPage'
import { ReactivationPage } from './components/ReactivationPage'
import { SubscribePage } from './components/SubscribePage'
import { SubscribeIngredientsPage } from './components/SubscribeIngredientsPage'

function App() {
  const path = window.location.pathname;
  if (path === '/solo' || path === '/solo/') return <SoloPage />;
  if (path === '/welcome-back' || path === '/welcome-back/') return <ReactivationPage />;
  if (path === '/subscribe-offer' || path === '/subscribe-offer/') return <SubscribePage />;
  if (path === '/subscribe-ingredients' || path === '/subscribe-ingredients/') return <SubscribeIngredientsPage />;
  return <LandingPage />;
}

export default App
