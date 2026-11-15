import { IonIcon } from '@ionic/react'
import { alertCircleOutline, clipboardOutline, globeOutline, linkOutline, sparkles } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { type Draft } from '../components/editor'
import { FormPage } from '../components/FormPage'
import { ReviewForm, SaveButton } from '../components/ReviewForm'
import { aiAvailable, asUrl, importRecipeFromUrl } from '../lib/ai'

type Phase = 'enter' | 'loading' | 'review'

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

/**
 * Lenke → oppskrift. Oppskriftssider har nesten alltid ferdig strukturerte
 * data (schema.org/Recipe) som leses direkte. Ellers – f.eks. TikTok – leser
 * Claude teksten, og mangler stegene, kan de foreslås i kontrollskjemaet.
 */
export default function LinkPage() {
  const { search } = useLocation()
  const [url, setUrl] = useState(() => new URLSearchParams(search).get('url') ?? '')
  const [phase, setPhase] = useState<Phase>('enter')
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [uncertain, setUncertain] = useState<string[]>([])
  const [source, setSource] = useState<'structured' | 'ai'>('structured')
  const valid = asUrl(url)
  const canClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText

  const fetchIt = async (target = valid) => {
    if (!target) return
    setPhase('loading')
    setError(null)
    try {
      const r = await importRecipeFromUrl(target)
      setDraft({ ...r.draft, attachments: [] })
      setUncertain(r.uncertain)
      setSource(r.source)
      setPhase('review')
    } catch (e) {
      setError((e as Error).message)
      setPhase('enter')
    }
  }

  // Kom vi hit med ?url= (f.eks. fra lim inn-siden), hent med en gang
  useEffect(() => {
    if (valid && new URLSearchParams(search).get('url') && aiAvailable) void fetchIt(valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'review' && draft) {
    return (
      <FormPage title="Fra lenke" back="/ny" footer={<><button className="btn btn-secondary min-h-14" onClick={() => setPhase('enter')}>Tilbake</button><SaveButton draft={draft} /></>}>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="mt-2 text-[2rem] leading-tight font-semibold">Se over forslaget</h1>
            <p className="mt-2 flex items-center gap-2 text-ink-2">
              <IonIcon icon={globeOutline} aria-hidden /> Hentet fra <strong className="text-ink">{host(draft.sourceUrl ?? url)}</strong>
              {source === 'ai' && ' – lest av Claude'}
            </p>
          </div>
          {uncertain.length > 0 && (
            <div className="missing rounded-2xl p-4">
              <p className="flex items-center gap-2 font-bold text-saffron">
                <IonIcon icon={alertCircleOutline} aria-hidden /> Sjekk dette:
              </p>
              <ul className="mt-1 list-disc pl-6 text-ink-2">
                {uncertain.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </div>
          )}
          <ReviewForm draft={draft} onChange={setDraft} />
        </div>
      </FormPage>
    )
  }

  return (
    <FormPage title="Fra lenke" back="/ny">
      <h1 className="mt-2 text-[2rem] leading-tight font-semibold">Lim inn en lenke</h1>
      <p className="mt-2 text-ink-2">Fra en oppskriftsside, en blogg eller TikTok. Vi henter ingredienser og fremgangsmåte for deg.</p>

      {!aiAvailable ? (
        <p className="mt-6 rounded-2xl bg-sea-soft p-4 text-ink">Henting fra lenker krever innlogging. Kopier heller teksten fra siden og bruk «Lim inn tekst».</p>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void fetchIt()
          }}
        >
          <label className="relative block">
            <span className="sr-only">Lenke</span>
            <IonIcon icon={linkOutline} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl text-ink-3" />
            <input
              className="field min-h-14 pl-12 text-[1.05rem]"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              disabled={phase === 'loading'}
            />
          </label>
          {error && (
            <p role="alert" className="flex gap-2 rounded-2xl bg-tomato-soft p-4 font-bold text-tomato-deep">
              <IonIcon icon={alertCircleOutline} className="mt-0.5 shrink-0 text-xl" aria-hidden /> {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {canClipboard && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={phase === 'loading'}
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText()
                    if (t) setUrl(t.trim())
                    const u = asUrl(t)
                    if (u) void fetchIt(u)
                  } catch { /* brukeren sa nei – de kan lime inn selv */ }
                }}
              >
                <IonIcon icon={clipboardOutline} aria-hidden /> Lim inn
              </button>
            )}
            <button className="btn btn-primary min-h-12 flex-1" disabled={!valid || phase === 'loading'}>
              <IonIcon icon={sparkles} aria-hidden /> {phase === 'loading' ? `Henter fra ${host(valid ?? url)} …` : 'Hent oppskriften'}
            </button>
          </div>
          <p className="text-[0.9rem] text-ink-3">Kilden lagres med oppskriften. Noen sider stenger ute apper – da kan du kopiere teksten i stedet.</p>
        </form>
      )}
    </FormPage>
  )
}
