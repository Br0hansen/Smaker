import { IonContent, IonIcon, IonPage } from '@ionic/react'
import { bookOutline, logOutOutline, peopleOutline } from 'ionicons/icons'
import { useState } from 'react'
import { Wordmark } from '../components/AppChrome'
import { createFamily, joinFamily, parseInvite, pendingInvite, signOut, useEmail } from '../data/store'

type Choice = 'new' | 'join'

function guessName(email?: string) {
  const local = email?.split('@')[0]?.split(/[._-]/)[0] ?? ''
  return local ? local[0].toUpperCase() + local.slice(1) : ''
}

/** Første gang: hva heter du, og vil du starte en kokebok eller bli med i en? */
export default function OnboardingPage() {
  const email = useEmail()
  const invite = pendingInvite()
  const [name, setName] = useState(() => guessName(email))
  const [choice, setChoice] = useState<Choice>(invite ? 'join' : 'new')
  const [familyName, setFamilyName] = useState('')
  const [inviteText, setInviteText] = useState(invite ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = parseInvite(inviteText)
  const canGo = name.trim().length > 0 && (choice === 'new' ? familyName.trim().length > 0 : !!token)

  const go = async () => {
    setBusy(true)
    setError(null)
    try {
      if (choice === 'new') await createFamily(familyName, name)
      else await joinFamily(token!, name)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <IonPage>
      <IonContent>
        <form
          className="mx-auto flex min-h-full max-w-md flex-col gap-7 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10"
          onSubmit={(e) => {
            e.preventDefault()
            if (canGo && !busy) void go()
          }}
        >
          <div className="flex items-center justify-between">
            <Wordmark />
            <button type="button" className="btn btn-ghost min-h-10 text-[0.9rem]" onClick={() => void signOut()}>
              <IonIcon icon={logOutOutline} aria-hidden /> Logg ut
            </button>
          </div>

          <div>
            <h1 className="text-[2rem] leading-tight font-semibold">Velkommen!</h1>
            <p className="mt-2 text-[1.05rem] text-ink-2">To små ting før vi begynner.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-bold text-ink-2">Hva vil du hete i familien?</span>
            <input className="field min-h-14 text-[1.1rem]" value={name} onChange={(e) => setName(e.target.value)} placeholder="F.eks. Mamma eller Kari" maxLength={40} />
            <span className="text-[0.88rem] text-ink-3">Vises på oppskriftene du legger inn.</span>
          </label>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 font-bold text-ink-2">Hva vil du gjøre?</legend>
            <ChoiceCard
              selected={choice === 'join'}
              onSelect={() => setChoice('join')}
              icon={peopleOutline}
              title="Bli med i familiens kokebok"
              text="Du har fått en sekstegns kode eller invitasjonslenke fra noen i familien."
            />
            {choice === 'join' && (
              <label className="flex flex-col gap-1.5 pl-1">
                <span className="text-[0.92rem] font-bold text-ink-2">Invitasjonskode eller lenke</span>
                <input className="field font-mono uppercase" value={inviteText} onChange={(e) => setInviteText(e.target.value)} placeholder="F.eks. K7P4X2" autoCapitalize="characters" autoComplete="one-time-code" />
              </label>
            )}
            <ChoiceCard
              selected={choice === 'new'}
              onSelect={() => setChoice('new')}
              icon={bookOutline}
              title="Start en ny kokebok"
              text="Du blir eier og kan invitere resten av familien."
            />
            {choice === 'new' && (
              <label className="flex flex-col gap-1.5 pl-1">
                <span className="text-[0.92rem] font-bold text-ink-2">Hva skal kokeboka hete?</span>
                <input className="field" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="F.eks. Familien Hansen" maxLength={80} />
              </label>
            )}
          </fieldset>

          {error && <p role="alert" className="font-bold text-tomato">{error}</p>}
          <button className="btn btn-primary mt-auto min-h-14 text-[1.1rem]" disabled={!canGo || busy}>
            {busy ? 'Et øyeblikk …' : choice === 'new' ? 'Start kokeboka' : 'Bli med'}
          </button>
        </form>
      </IonContent>
    </IonPage>
  )
}

function ChoiceCard({ selected, onSelect, icon, title, text }: { selected: boolean; onSelect: () => void; icon: string; title: string; text: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-start gap-4 rounded-[var(--radius-card)] p-4 text-left transition-shadow ${selected ? 'bg-card shadow-card ring-[3px] ring-tomato' : 'bg-card/60 ring-1 ring-line'}`}
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${selected ? 'bg-tomato text-white' : 'bg-paper-2 text-ink-2'}`}>
        <IonIcon icon={icon} className="text-2xl" aria-hidden />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-[1.2rem] font-semibold">{title}</span>
        <span className="text-[0.95rem] text-ink-2">{text}</span>
      </span>
    </button>
  )
}
