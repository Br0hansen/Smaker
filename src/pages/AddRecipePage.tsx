import { IonIcon } from '@ionic/react'
import { cameraOutline, chevronForward, clipboardOutline, createOutline } from 'ionicons/icons'
import { Link } from 'react-router-dom'
import { FormPage } from '../components/FormPage'

const METHODS = [
  {
    to: '/ny/lim-inn',
    icon: clipboardOutline,
    title: 'Lim inn tekst',
    text: 'Fra en nettside, en melding eller et dokument. Vi sorterer ingredienser og steg for deg.',
    tone: 'bg-sage-soft text-sage',
    badge: 'Raskest',
  },
  {
    to: '/ny/bilde',
    icon: cameraOutline,
    title: 'Ta bilde eller skjermbilde',
    text: 'Håndskrevet lapp, oppskriftskort, kokebokside eller skjermbilde. Vi leser den for deg, og originalen tas vare på.',
    tone: 'bg-saffron-soft text-saffron',
  },
  {
    to: '/ny/manuelt',
    icon: createOutline,
    title: 'Skriv selv',
    text: 'En enkel veiviser i fire steg. Bare navn, ingredienser og fremgangsmåte er nødvendig.',
    tone: 'bg-plum-soft text-plum',
  },
]

export default function AddRecipePage() {
  return (
    <FormPage title="Ny oppskrift">
      <h1 className="mt-2 text-[2rem] leading-tight font-semibold md:text-[2.4rem]">Hvordan vil du legge den inn?</h1>
      <p className="mt-2 text-[1.05rem] text-ink-2">Du kan alltid se over og rette alt før det lagres.</p>
      <ul className="mt-8 flex flex-col gap-4">
        {METHODS.map((m) => (
          <li key={m.to}>
            <Link
              to={m.to}
              className="group flex items-start gap-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift sm:items-center sm:gap-5 sm:p-6"
            >
              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl sm:size-16 ${m.tone}`}>
                <IonIcon icon={m.icon} className="text-[2rem]" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-display text-[1.35rem] font-semibold">{m.title}</span>
                  {m.badge && <span className="chip min-h-6 bg-sage text-[0.75rem] text-white">{m.badge}</span>}
                </span>
                <span className="text-ink-2">{m.text}</span>
              </span>
              <IonIcon icon={chevronForward} className="hidden text-2xl text-ink-3 transition-transform group-hover:translate-x-1 sm:block" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </FormPage>
  )
}
