import { IonContent, IonIcon, IonPage } from '@ionic/react'
import { arrowBack, mailOpenOutline, mailOutline, peopleOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { Wordmark } from '../components/AppChrome'
import { pendingInvite, sendMagicLink, verifyCode } from '../data/store'

/**
 * Innlogging med magisk lenke – ingen passord å huske.
 * E-posten inneholder også en kode, fordi en installert app på iPhone ikke deler
 * innlogging med Safari: da skriver man inn koden i appen i stedet for å trykke på lenken.
 */
export default function AuthPage() {
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('smaker:email') ?? '' } catch { return '' }
  })
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const invited = !!pendingInvite()

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      await sendMagicLink(email)
      try { localStorage.setItem('smaker:email', email.trim()) } catch { /* ignorer */ }
      setSentTo(email.trim())
      setCooldown(60)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    setError(null)
    try {
      await verifyCode(sentTo!, code)
      // onAuthStateChange tar over herfra
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const validCode = /^\d{6,10}$/.test(code.replace(/\s/g, ''))

  return (
    <IonPage>
      <IonContent>
        <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10">
          <Wordmark />

          <div
            aria-hidden
            className="gingham mt-8 h-28 rounded-[var(--radius-card)]"
            style={{ ['--tone' as string]: 'var(--color-tomato)', ['--tone-bg' as string]: 'var(--color-tomato-soft)' }}
          />

          {invited && (
            <p className="mt-6 flex items-center gap-3 rounded-2xl bg-sage-soft p-4 font-bold text-ink">
              <IonIcon icon={peopleOutline} className="shrink-0 text-2xl text-sage" aria-hidden />
              Du er invitert til en familie. Logg inn for å bli med.
            </p>
          )}

          {!sentTo ? (
            <form
              className="mt-8 flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (validEmail && !busy) void send()
              }}
            >
              <div>
                <h1 className="text-[2rem] leading-tight font-semibold">Familiens kokebok</h1>
                <p className="mt-2 text-[1.05rem] text-ink-2">Skriv e-postadressen din, så sender vi deg en lenke. Ingen passord å huske.</p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="font-bold text-ink-2">E-post</span>
                <input
                  className="field min-h-14 text-[1.1rem]"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="navn@eksempel.no"
                  autoFocus
                />
              </label>
              {error && <p role="alert" className="font-bold text-tomato">{error}</p>}
              <button className="btn btn-primary min-h-14 text-[1.1rem]" disabled={!validEmail || busy}>
                <IonIcon icon={mailOutline} aria-hidden className="text-2xl" /> {busy ? 'Sender …' : 'Send meg en lenke'}
              </button>
            </form>
          ) : (
            <form
              className="mt-8 flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (validCode && !busy) void verify()
              }}
            >
              <div className="flex flex-col items-start gap-3">
                <span className="grid size-14 place-items-center rounded-2xl bg-saffron-soft text-saffron">
                  <IonIcon icon={mailOpenOutline} className="text-3xl" aria-hidden />
                </span>
                <h1 className="text-[2rem] leading-tight font-semibold">Sjekk e-posten din</h1>
                <p className="text-[1.05rem] text-ink-2">
                  Vi har sendt en lenke til <strong className="text-ink">{sentTo}</strong>. Trykk på den, så er du inne.
                </p>
              </div>

              <div className="rounded-2xl bg-card p-4 shadow-card">
                <label className="flex flex-col gap-2">
                  <span className="font-bold text-ink-2">Bruker du appen fra hjemskjermen? Skriv inn koden fra e-posten:</span>
                  <input
                    className="field min-h-14 text-center font-display text-[1.6rem] tracking-[0.3em] tabular-nums"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={12}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ''))}
                    placeholder="••••••"
                    aria-label="Kode fra e-posten"
                  />
                </label>
                {error && <p role="alert" className="mt-3 font-bold text-tomato">{error}</p>}
                <button className="btn btn-primary mt-3 min-h-14 w-full text-[1.1rem]" disabled={!validCode || busy}>
                  {busy ? 'Logger inn …' : 'Logg inn'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-secondary" disabled={cooldown > 0 || busy} onClick={() => void send()}>
                  {cooldown > 0 ? `Send på nytt om ${cooldown} s` : 'Send på nytt'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setSentTo(null); setCode(''); setError(null) }}>
                  <IonIcon icon={arrowBack} aria-hidden /> Annen e-post
                </button>
              </div>
              <p className="text-[0.9rem] text-ink-3">Finner du ikke e-posten? Se i søppelpost-mappen.</p>
            </form>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}
