import { IonIcon } from '@ionic/react'
import { checkmark, flameOutline, timeOutline } from 'ionicons/icons'
import { useState } from 'react'
import { formatAmount, formatMinutes, isToTaste } from '../domain/quantity'
import type { Ingredient, Recipe } from '../domain/types'
import { MissingMark } from './ui'

function groupIngredients(ings: Ingredient[]): { group?: string; items: Ingredient[] }[] {
  const out: { group?: string; items: Ingredient[] }[] = []
  for (const i of ings) {
    const last = out[out.length - 1]
    if (last && last.group === i.group) last.items.push(i)
    else out.push({ group: i.group, items: [i] })
  }
  return out
}

/** Klassisk oppskrift: ingrediensliste + nummerert fremgangsmåte, begge kan krysses av. */
export function ClassicView({ recipe, factor, showMissing = true }: { recipe: Recipe; factor: number; showMissing?: boolean }) {
  const [gotIt, setGotIt] = useState<Set<string>>(new Set())
  const [done, setDone] = useState<Set<string>>(new Set())
  const toggle = (set: Set<string>, id: string, update: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update(next)
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] md:gap-12">
      <section aria-labelledby="ing-title" className="md:sticky md:top-4 md:self-start">
        <h2 id="ing-title" className="mb-3 text-[1.45rem] font-semibold">Ingredienser</h2>
        <div className="flex flex-col gap-5 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
          {groupIngredients(recipe.ingredients).map((g, gi) => (
            <div key={gi}>
              {g.group && <h3 className="eyebrow mb-1">{g.group}</h3>}
              <ul className="flex flex-col">
                {g.items.map((ing) => {
                  const checked = gotIt.has(ing.id)
                  const amount = formatAmount(ing.amount, ing.amountMax, ing.unit, factor)
                  return (
                    <li key={ing.id}>
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-paper">
                        <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(gotIt, ing.id, setGotIt)} />
                        <span
                          aria-hidden
                          className={`grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-tomato ${
                            checked ? 'border-sage bg-sage text-white' : 'border-line-2 bg-card'
                          }`}
                        >
                          {checked && <IonIcon icon={checkmark} />}
                        </span>
                        <span className={`flex flex-1 flex-wrap items-baseline gap-x-2 ${checked ? 'text-ink-3 line-through' : ''}`}>
                          {amount ? (
                            <strong className="font-bold tabular-nums">{amount}</strong>
                          ) : (
                            showMissing && !isToTaste(ing.name) && <MissingMark>mengde?</MissingMark>
                          )}
                          <span>{ing.name}</span>
                          {ing.note && <span className="text-[0.9rem] text-ink-3">{ing.note}</span>}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="steps-title">
        <h2 id="steps-title" className="mb-3 text-[1.45rem] font-semibold">Slik gjør du</h2>
        <ol className="flex flex-col gap-3">
          {recipe.steps.map((s, i) => {
            const isDone = done.has(s.id)
            return (
              <li key={s.id}>
                <button
                  onClick={() => toggle(done, s.id, setDone)}
                  aria-pressed={isDone}
                  className={`flex w-full gap-4 rounded-[var(--radius-card)] p-4 text-left transition-colors ${isDone ? 'bg-paper-2' : 'bg-card shadow-card hover:bg-[#fffaf2]'}`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-lg font-semibold ${isDone ? 'bg-sage text-white' : 'bg-tomato-soft text-tomato'}`}
                  >
                    {isDone ? <IonIcon icon={checkmark} aria-label="Ferdig" /> : i + 1}
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className={`text-[1.08rem] leading-relaxed ${isDone ? 'text-ink-3' : 'text-ink'}`}>{s.text}</span>
                    {(s.durationMin != null || s.temperatureC != null) && (
                      <span className="flex flex-wrap gap-2">
                        {s.durationMin != null && (
                          <span className="chip min-h-7 bg-saffron-soft text-[0.82rem] text-ink">
                            <IonIcon icon={timeOutline} aria-hidden /> {formatMinutes(s.durationMin, s.durationMaxMin)}
                          </span>
                        )}
                        {s.temperatureC != null && (
                          <span className="chip min-h-7 bg-tomato-soft text-[0.82rem] text-ink">
                            <IonIcon icon={flameOutline} aria-hidden /> {s.temperatureC} °C
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-[0.88rem] text-ink-3">Trykk på et steg for å krysse det av.</p>
      </section>
    </div>
  )
}
