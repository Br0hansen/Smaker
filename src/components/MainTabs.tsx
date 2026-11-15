import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, useIonRouter } from '@ionic/react'
import { add } from 'ionicons/icons'
import { Route } from 'react-router-dom'
import { useMediaQuery } from '../hooks/useMediaQuery'
import FamilyPage from '../pages/FamilyPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import { TABS } from './tabs'

/**
 * Hovedseksjonene som faner (Ionic sitt eget fanemønster). Hver fane beholder
 * siden sin, og bytte mellom dem er et rent fanebytte – ikke en side-overgang.
 * Oppskrift, innlegging og matlaging ligger utenfor fanene (fullskjerm).
 *
 * Tidligere byttet en egen fanelinje side med router.push(path, 'none', 'replace')
 * i én felles stabel. Det er en kodesti Ionic ikke er laget for, og knappene
 * kunne slutte å virke etter mange raske bytter på telefon.
 */
export default function MainTabs() {
  const wide = useMediaQuery('(min-width: 768px)')
  const router = useIonRouter()
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/" element={<HomePage />} />
        <Route path="/familie" element={<FamilyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </IonRouterOutlet>
      {/* På store skjermer ligger navigasjonen i toppfeltet. Inline-stil, fordi Ionic sine stiler overstyrer md:hidden. */}
      <IonTabBar slot="bottom" className="smaker-tabbar" style={wide ? { display: 'none' } : undefined}>
        <IonTabButton tab={TABS[0].tab} href={TABS[0].href}>
          <IonIcon icon={TABS[0].iconOn} className="icon-on" aria-hidden />
          <IonIcon icon={TABS[0].icon} className="icon-off" aria-hidden />
          <IonLabel>{TABS[0].label}</IonLabel>
        </IonTabButton>
        <IonTabButton tab={TABS[1].tab} href={TABS[1].href}>
          <IonIcon icon={TABS[1].iconOn} className="icon-on" aria-hidden />
          <IonIcon icon={TABS[1].icon} className="icon-off" aria-hidden />
          <IonLabel>{TABS[1].label}</IonLabel>
        </IonTabButton>
      </IonTabBar>
      {/* «Legg til» er en handling, ikke en fane – IonTabBar godtar bare faneknapper,
          så den ligger i samme spor og plasseres over midten av fanelinjen. */}
      {!wide && (
        <button type="button" slot="bottom" className="smaker-add" onClick={() => router.push('/ny')}>
          <span className="smaker-add-circle">
            <IonIcon icon={add} aria-hidden />
          </span>
          Legg til
        </button>
      )}
    </IonTabs>
  )
}
