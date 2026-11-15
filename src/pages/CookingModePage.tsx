import { IonContent, IonIcon, IonModal, IonPage, useIonRouter } from '@ionic/react'
import { checkmarkCircle, chevronBack, close, listOutline, pause, play, sunnyOutline, timerOutline, trashOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { StepFocus } from '../components/StepFocus'
import { ServingsStepper } from '../components/ui'
import { useRecipe } from '../data/store'
import { formatAmount, formatMinutes } from '../domain/quantity'
import { scaleFactor } from '../domain/validate'
import { formatClock, useTimers } from '../hooks/useTimers'
import { useWakeLock } from '../hooks/useWakeLock'
import NotFoundPage from './NotFoundPage'

export default function CookingModePage() {
  const { id } = useParams()
  const recipe = useRecipe(id)
  const { search } = useLocation()
  const router = useIonRouter()
  const initial = Number(new URLSearchParams(search).get('porsjoner')) || null
  const [servings, setServings] = useState<number | null>(initial)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [finished, setFinished] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const wake = useWakeLock(true)
  const { timers, start, toggle, remove, left } = useTimers()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!recipe) return <NotFoundPage />
  const n = recipe.steps.length
  const step = recipe.steps[index]
  const portions = servings ?? recipe.servings ?? 1
  const factor = scaleFactor(recipe.servings, portions)
  const exit = () => (router.canGoBack() ? router.goBack() : router.push(`/oppskrift/${recipe.id}`, 'back', 'replace'))

  function next() {
    setDone((d) => new Set(d).add(index))
    if (index >= n - 1) setFinished(true)
    else setIndex(index + 1)
  }

  return (
    <IonPage>
      <IonContent fullscreen className="[--background:var(--color-paper)]">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-8">
          {/* Toppfelt */}
          <div className="flex items-center gap-2 py-2">
            <button className="btn btn-ghost size-12 p-0" onClick={exit} aria-label="Avslutt matlaging">
              <IonIcon icon={close} className="text-3xl" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-lg font-semibold">{recipe.title}</div>
              {wake === 'active' && (
                <div className="flex items-center gap-1 text-[0.8rem] font-bold text-sage">
                  <IonIcon icon={sunnyOutline} aria-hidden /> Skjermen holdes våken
                </div>
              )}
            </div>
            <button className="btn btn-secondary min-h-11 px-4" onClick={() => setAllOpen(true)}>
              <IonIcon icon={listOutline} aria-hidden /> Alt
            </button>
          </div>

          {/* Fremdrift – trykk for å hoppe */}
          <nav aria-label="Steg" className="flex gap-1.5 py-3">
            {recipe.steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setIndex(i); setFinished(false) }}
                aria-label={`Gå til steg ${i + 1}`}
                aria-current={i === index ? 'step' : undefined}
                className={`h-2.5 flex-1 rounded-full transition-colors ${i === index ? 'bg-tomato' : done.has(i) ? 'bg-sage' : 'bg-line'}`}
              />
            ))}
          </nav>

          <main className="flex flex-1 flex-col justify-center py-6">
            {finished ? (
              <div className="flex flex-col items-center gap-5 text-center">
                <IonIcon icon={checkmarkCircle} className="text-7xl text-sage" aria-hidden />
                <h1 className="text-[2.4rem] font-semibold">Velbekomme!</h1>
                <p className="text-xl text-ink-2">Alle stegene er ferdige.</p>
                <button className="btn btn-primary min-h-14 px-8 text-lg" onClick={exit}>Tilbake til oppskriften</button>
              </div>
            ) : (
              <>
                <StepFocus recipe={recipe} index={index} factor={factor} size="xl" />
                {step.durationMin != null && !timers.some((t) => t.id === step.id) && (
                  <button
                    className="btn btn-secondary mt-6 min-h-14 self-start px-6 text-lg"
                    onClick={() => start(step.id, `${index + 1}. ${step.action}`, step.durationMaxMin ?? step.durationMin!)}
                  >
                    <IonIcon icon={timerOutline} aria-hidden className="text-2xl" /> Start tidtaker ({formatMinutes(step.durationMaxMin ?? step.durationMin)})
                  </button>
                )}
              </>
            )}
          </main>

          {/* Tidtakere */}
          {timers.length > 0 && (
            <div className="flex flex-col gap-2 pb-3" aria-live="assertive">
              {timers.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-card ${t.done ? 'animate-pulse bg-tomato text-white' : 'bg-card'}`}
                >
                  <IonIcon icon={timerOutline} className="text-2xl" aria-hidden />
                  <div className="flex-1">
                    <div className="font-bold">{t.label}</div>
                    <div className={`font-display text-2xl tabular-nums ${t.done ? '' : 'text-ink'}`}>{t.done ? 'Ferdig!' : formatClock(left(t))}</div>
                  </div>
                  {!t.done && (
                    <button className="btn btn-ghost size-12 p-0" onClick={() => toggle(t.id)} aria-label={t.endsAt ? 'Pause' : 'Fortsett'}>
                      <IonIcon icon={t.endsAt ? pause : play} className="text-2xl" />
                    </button>
                  )}
                  <button className={`btn size-12 p-0 ${t.done ? 'bg-white/20' : 'btn-ghost'}`} onClick={() => remove(t.id)} aria-label="Fjern tidtaker">
                    <IonIcon icon={t.done ? close : trashOutline} className="text-2xl" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Store knapper nederst */}
          {!finished && (
            <div className="sticky bottom-0 -mx-4 flex gap-3 bg-paper/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur md:-mx-8 md:px-8">
              <button className="btn btn-secondary min-h-16 shrink-0 px-5 text-lg" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} aria-label="Forrige steg">
                <IonIcon icon={chevronBack} className="text-2xl" />
              </button>
              <button className="btn btn-primary min-h-16 min-w-0 flex-1 text-[1.15rem] leading-tight whitespace-normal" onClick={next}>
                <IonIcon icon={checkmarkCircle} aria-hidden className="text-2xl" />
                {index >= n - 1 ? 'Ferdig!' : 'Ferdig – neste steg'}
              </button>
            </div>
          )}
        </div>

        {/* Alle ingredienser + porsjoner */}
        <IonModal isOpen={allOpen} onDidDismiss={() => setAllOpen(false)} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
          <div className="flex flex-col gap-5 p-6">
            <h2 className="text-[1.6rem] font-semibold">Alle ingredienser</h2>
            {recipe.servings != null && <ServingsStepper value={portions} onChange={setServings} unit={recipe.servingsUnit ?? 'porsjoner'} size="lg" />}
            <ul className="flex flex-col divide-y divide-dashed divide-line text-xl">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex items-baseline gap-4 py-3">
                  <strong className="min-w-[6rem] text-right tabular-nums">{formatAmount(ing.amount, ing.amountMax, ing.unit, factor) || '–'}</strong>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
