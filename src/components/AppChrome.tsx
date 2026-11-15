import { IonHeader, IonIcon, IonToolbar, NavContext, useIonRouter } from '@ionic/react'
import { add } from 'ionicons/icons'
import { useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { useFamily } from '../data/store'
import { TABS } from './tabs'

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-baseline font-display font-semibold tracking-tight text-ink ${small ? 'text-xl' : 'text-2xl'}`}>
      Smaker
      <span aria-hidden className="ml-0.5 inline-block size-[0.32em] rounded-full bg-tomato" />
    </span>
  )
}

/** Toppfelt for hovedsidene. På store skjermer ligger navigasjonen her. */
export function MainHeader() {
  const family = useFamily()
  const router = useIonRouter()
  const nav = useContext(NavContext)
  const { pathname } = useLocation()
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar>
        <div className="page-wrap flex h-14 items-center gap-6">
          <button className="flex flex-col items-start leading-none" onClick={() => nav.changeTab(TABS[0].tab, TABS[0].href)}>
            <Wordmark />
            <span className="mt-0.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink-3">{family.name}</span>
          </button>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Hovedmeny">
            {TABS.map((n) => (
              <button
                key={n.tab}
                onClick={() => nav.changeTab(n.tab, n.href)}
                aria-current={pathname === n.href ? 'page' : undefined}
                className="btn btn-ghost min-h-10 aria-[current=page]:bg-paper-2 aria-[current=page]:text-ink"
              >
                {n.label}
              </button>
            ))}
            <button className="btn btn-primary ml-2 min-h-10" onClick={() => router.push('/ny')}>
              <IonIcon icon={add} aria-hidden className="text-xl" /> Legg til oppskrift
            </button>
          </nav>
        </div>
      </IonToolbar>
    </IonHeader>
  )
}
