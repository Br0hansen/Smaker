import { IonIcon } from '@ionic/react'
import { chevronBack, chevronForward, flameOutline, gridOutline, informationCircleOutline, listOutline } from 'ionicons/icons'
import { useEffect, useMemo, useState } from 'react'
import { buildGrid } from '../domain/grid'
import type { Recipe } from '../domain/types'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { RecipeGrid } from './RecipeGrid'
import { StepFocus } from './StepFocus'
import { Segmented } from './ui'

type Mode = 'grid' | 'focus'

/**
 * Recipe Grid-visningen med navigasjon.
 * Stor skjerm: fullt rutenett + valgt steg ved siden av.
 * Mobil: kompakt rutenett ELLER steg-for-steg med minikart – aldri panorering i en stor tabell.
 */
export function GridView({ recipe, factor }: { recipe: Recipe; factor: number }) {
  const layout = useMemo(() => buildGrid(recipe), [recipe])
  const wide = useMediaQuery('(min-width: 900px)')
  const [mode, setMode] = useState<Mode>('grid')
  const [active, setActive] = useState(0)
  const n = recipe.steps.length

  const go = (d: number) => setActive((a) => Math.min(n - 1, Math.max(0, a + d)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const select = (i: number) => {
    setActive(i)
    if (!wide) setMode('focus')
  }

  const nav = (
    <div className="flex items-center gap-2">
      <button className="btn btn-secondary size-12 p-0" onClick={() => go(-1)} disabled={active === 0} aria-label="Forrige steg">
        <IonIcon icon={chevronBack} className="text-xl" />
      </button>
      <span className="min-w-[6.5rem] text-center font-bold tabular-nums text-ink-2">
        Steg {active + 1} av {n}
      </span>
      <button className="btn btn-primary size-12 p-0" onClick={() => go(1)} disabled={active >= n - 1} aria-label="Neste steg">
        <IonIcon icon={chevronForward} className="text-xl" />
      </button>
    </div>
  )

  const prep = layout.prepSteps.length > 0 && (
    <div className="mb-3 flex flex-wrap gap-2">
      {layout.prepSteps.map(({ step, index }) => (
        <button
          key={step.id}
          onClick={() => select(index)}
          className={`chip min-h-9 ${index === active ? 'bg-tomato text-white' : 'bg-tomato-soft text-ink'}`}
        >
          <IonIcon icon={flameOutline} aria-hidden /> {index + 1}. {step.text}
        </button>
      ))}
    </div>
  )

  const warnings = layout.warnings.length > 0 && (
    <p className="mt-3 flex items-start gap-2 text-[0.9rem] text-saffron">
      <IonIcon icon={informationCircleOutline} className="mt-0.5 shrink-0" aria-hidden />
      {layout.warnings.join(' ')}
    </p>
  )

  if (wide) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-6">
        <div className="min-w-0">
          {prep}
          <div className="overflow-x-auto pb-2">
            <RecipeGrid recipe={recipe} layout={layout} factor={factor} activeIndex={active} onSelect={setActive} variant="full" />
          </div>
          {warnings}
          <Legend />
        </div>
        <aside className="sticky top-4 flex flex-col gap-4 rounded-[var(--radius-card)] bg-paper-2 p-5">
          <StepFocus recipe={recipe} index={active} factor={factor} />
          {nav}
        </aside>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Segmented
          label="Visning"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'grid', label: <span className="inline-flex items-center gap-1.5"><IonIcon icon={gridOutline} aria-hidden /> Rutenett</span> },
            { value: 'focus', label: <span className="inline-flex items-center gap-1.5"><IonIcon icon={listOutline} aria-hidden /> Steg for steg</span> },
          ]}
        />
      </div>

      {mode === 'grid' ? (
        <>
          {prep}
          <RecipeGrid recipe={recipe} layout={layout} factor={factor} activeIndex={active} onSelect={select} variant="compact" />
          <p className="text-[0.88rem] text-ink-3">Trykk på et steg for å se det i detalj.</p>
          {warnings}
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <button onClick={() => setMode('grid')} className="rounded-xl bg-card p-2 shadow-card" aria-label="Vis hele rutenettet">
            <RecipeGrid recipe={recipe} layout={layout} activeIndex={active} variant="mini" />
          </button>
          <StepFocus recipe={recipe} index={active} factor={factor} />
          <div className="flex justify-center">{nav}</div>
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.85rem] text-ink-2">
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-8 rounded bg-sage-soft ring-1 ring-sage/30" /> Arbeid
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-4 w-8 rounded ring-1 ring-sage/30"
          style={{ background: 'repeating-linear-gradient(135deg, var(--color-sage-soft) 0 4px, transparent 4px 8px)' }}
        />
        Venter / skjer parallelt
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-8 rounded bg-saffron-soft ring-1 ring-saffron/30" />
        <span className="-ml-1 h-4 w-8 rounded bg-plum-soft ring-1 ring-plum/30" /> Farge = egen delprosess
      </span>
    </div>
  )
}
