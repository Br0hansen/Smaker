import { IonApp, IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route } from 'react-router-dom'
import { Wordmark } from './components/AppChrome'
import { useStatus } from './data/store'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import AddRecipePage from './pages/AddRecipePage'
import CookingModePage from './pages/CookingModePage'
import ManualWizardPage from './pages/ManualWizardPage'
import MainTabs from './components/MainTabs'
import LinkPage from './pages/LinkPage'
import PastePage from './pages/PastePage'
import PhotoPage from './pages/PhotoPage'
import RecipePage from './pages/RecipePage'

/**
 * Ruter (norske URL-er, så lenker som deles i familien er lesbare):
 *   /                         Hjem         (fane)
 *   /familie                  Familien     (fane)
 *   /ny                       Velg hvordan du vil legge inn
 *   /ny/lenke | /ny/lim-inn | /ny/bilde | /ny/manuelt
 *   /oppskrift/:id            Oppskrift (klassisk + Recipe Grid)
 *   /oppskrift/:id/rediger    Rediger
 *   /oppskrift/:id/lag        Matlagingsmodus
 */
export default function App() {
  const status = useStatus()
  if (status === 'loading') return <Splash />
  if (status === 'signed-out') return <IonApp><AuthPage /></IonApp>
  if (status === 'onboarding') return <IonApp><OnboardingPage /></IonApp>
  return (
    <IonApp>
      <IonReactRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <IonRouterOutlet>
          <Route path="/ny" element={<AddRecipePage />} />
          <Route path="/ny/lim-inn" element={<PastePage />} />
          <Route path="/ny/lenke" element={<LinkPage />} />
          <Route path="/ny/bilde" element={<PhotoPage />} />
          <Route path="/ny/manuelt" element={<ManualWizardPage />} />
          <Route path="/oppskrift/:id" element={<RecipePage />} />
          <Route path="/oppskrift/:id/rediger" element={<ManualWizardPage />} />
          <Route path="/oppskrift/:id/lag" element={<CookingModePage />} />
          {/* Hjem og Familien er faner – må stå sist, den fanger alt annet */}
          <Route path="/*" element={<MainTabs />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  )
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper" role="status" aria-label="Laster kokeboka">
      <div className="flex flex-col items-center gap-3">
        <Wordmark />
        <span className="h-1 w-24 overflow-hidden rounded-full bg-line">
          <span className="block h-full w-1/3 animate-[splash_1s_ease-in-out_infinite] rounded-full bg-tomato" />
        </span>
      </div>
    </div>
  )
}
