import { IonFooter, IonHeader, IonIcon, IonToolbar, useIonRouter } from '@ionic/react'
import { add, home, homeOutline, people, peopleOutline } from 'ionicons/icons'
import { useLocation } from 'react-router-dom'
import { useFamily } from '../data/store'
import { useMediaQuery } from '../hooks/useMediaQuery'

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-baseline font-display font-semibold tracking-tight text-ink ${small ? 'text-xl' : 'text-2xl'}`}>
      Smaker
      <span aria-hidden className="ml-0.5 inline-block size-[0.32em] rounded-full bg-tomato" />
    </span>
  )
}

const NAV = [
  { path: '/', label: 'Oppskrifter', icon: homeOutline, iconOn: home },
  { path: '/familie', label: 'Familien', icon: peopleOutline, iconOn: people },
]

/** Toppfelt for hovedsidene. På store skjermer ligger navigasjonen her. */
export function MainHeader() {
  const family = useFamily()
  const router = useIonRouter()
  const { pathname } = useLocation()
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar>
        <div className="page-wrap flex h-14 items-center gap-6">
          <button className="flex flex-col items-start leading-none" onClick={() => router.push('/', 'none', 'replace')}>
            <Wordmark />
            <span className="mt-0.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink-3">{family.name}</span>
          </button>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Hovedmeny">
            {NAV.map((n) => (
              <button
                key={n.path}
                onClick={() => router.push(n.path, 'none', 'replace')}
                aria-current={pathname === n.path ? 'page' : undefined}
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

/** Fanelinje nederst på mobil, med en tydelig «Legg til» i midten. */
export function TabBar() {
  const router = useIonRouter()
  const { pathname } = useLocation()
  // Ionic-komponenter har egne stiler som overstyrer md:hidden – derfor sjekk i koden
  const wide = useMediaQuery('(min-width: 768px)')
  if (wide) return null
  const item = (n: (typeof NAV)[number]) => {
    const on = pathname === n.path
    return (
      <button
        key={n.path}
        onClick={() => router.push(n.path, 'none', 'replace')}
        aria-current={on ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.8rem] font-bold ${on ? 'text-tomato' : 'text-ink-3'}`}
      >
        <IonIcon icon={on ? n.iconOn : n.icon} aria-hidden className="text-[1.6rem]" />
        {n.label}
      </button>
    )
  }
  return (
    <IonFooter className="ion-no-border">
      <nav
        aria-label="Hovedmeny"
        className="flex items-end border-t border-line bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur"
      >
        {item(NAV[0])}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => router.push('/ny')}
            className="-mt-6 flex flex-col items-center gap-1 text-[0.8rem] font-bold text-tomato"
          >
            <span className="grid size-14 place-items-center rounded-full bg-tomato text-white shadow-lift ring-4 ring-paper">
              <IonIcon icon={add} aria-hidden className="text-[2rem]" />
            </span>
            Legg til
          </button>
        </div>
        {item(NAV[1])}
      </nav>
    </IonFooter>
  )
}
