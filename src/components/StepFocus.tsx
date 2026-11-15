import { IonIcon } from '@ionic/react'
import { arrowForward, flameOutline, timeOutline } from 'ionicons/icons'
import { inputsForStep } from '../domain/grid'
import { formatAmount, formatMinutes } from '../domain/quantity'
import type { Recipe } from '../domain/types'

/**
 * Ett steg i fokus: hva som går inn (ingredienser og mellomprodukter),
 * hva du gjør, og hva det blir til. Brukes i Recipe Grid på mobil og i
 * matlagingsmodus (size="xl").
 */
export function StepFocus({ recipe, index, factor = 1, size = 'md' }: { recipe: Recipe; index: number; factor?: number; size?: 'md' | 'xl' }) {
  const step = recipe.steps[index]
  if (!step) return null
  const { ingredients, intermediates } = inputsForStep(recipe, step.id)
  const xl = size === 'xl'
  const hasInputs = ingredients.length + intermediates.length > 0

  return (
    <article aria-live="polite" className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="eyebrow flex items-center gap-2">
          Steg {index + 1} av {recipe.steps.length}
          {step.suggested && <span className="chip min-h-6 bg-plum-soft px-2 text-[0.72rem] tracking-normal normal-case text-plum">Forslag</span>}
        </span>
        <h3 className={`font-semibold text-tomato ${xl ? 'text-[1.75rem] md:text-[2.1rem]' : 'text-[1.6rem]'}`}>{step.action}</h3>
      </header>

      <p className={`text-ink ${xl ? 'text-[1.4rem] leading-[1.35] md:text-[1.9rem]' : 'text-[1.15rem] leading-relaxed'}`}>{step.text}</p>

      {(step.durationMin != null || step.temperatureC != null) && (
        <div className="flex flex-wrap gap-2">
          {step.durationMin != null && (
            <span className={`chip bg-saffron-soft text-ink ${xl ? 'min-h-10 text-base' : ''}`}>
              <IonIcon icon={timeOutline} aria-hidden /> {formatMinutes(step.durationMin, step.durationMaxMin)}
            </span>
          )}
          {step.temperatureC != null && (
            <span className={`chip bg-tomato-soft text-ink ${xl ? 'min-h-10 text-base' : ''}`}>
              <IonIcon icon={flameOutline} aria-hidden /> {step.temperatureC} °C
            </span>
          )}
        </div>
      )}

      {hasInputs && (
        <section aria-label="Dette trenger du i steget" className="rounded-2xl bg-card p-4 shadow-card">
          <h4 className="eyebrow mb-2">Du trenger</h4>
          <ul className="flex flex-col divide-y divide-dashed divide-line">
            {intermediates.map((m) => (
              <li key={m.step.id} className={`flex items-center gap-3 py-2 ${xl ? 'text-xl' : ''}`}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper-2 text-[0.8rem] font-bold text-ink-2">{m.index + 1}</span>
                <span className="font-display italic">{m.label}</span>
                {m.step.produces && <span className="ml-auto text-[0.8rem] text-ink-3">fra steg {m.index + 1}</span>}
              </li>
            ))}
            {ingredients.map((ing) => {
              const amount = formatAmount(ing.amount, ing.amountMax, ing.unit, factor)
              return (
                <li key={ing.id} className={`flex items-baseline gap-3 py-2 ${xl ? 'text-xl' : ''}`}>
                  <strong className={`shrink-0 text-right font-bold tabular-nums ${xl ? 'min-w-[5.5rem]' : 'min-w-[4.5rem]'}`}>{amount || '–'}</strong>
                  <span>
                    {ing.name}
                    {ing.note && <span className="text-ink-3">, {ing.note}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {step.produces && (
        <p className={`flex items-center gap-2 font-display italic text-ink-2 ${xl ? 'text-xl' : ''}`}>
          <IonIcon icon={arrowForward} aria-hidden /> Blir til: <strong className="font-semibold not-italic text-ink">{step.produces}</strong>
        </p>
      )}
    </article>
  )
}
