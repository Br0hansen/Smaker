/**
 * Recipe Grid – visuell matrise der rader er ingredienser og kolonner er
 * handlinger fra venstre mot høyre. Celler som slår sammen flere ingredienser
 * dekker alle radene deres. En celle som "venter" (f.eks. pasta som koker mens
 * sausen lages) strekker seg mot høyre med stripet bakgrunn til den slås inn.
 */
import { IonIcon } from '@ionic/react'
import { checkmark, flameOutline, timeOutline } from 'ionicons/icons'
import { useMemo } from 'react'
import { buildGrid, type GridLayout } from '../domain/grid'
import { formatAmount, formatMinutes } from '../domain/quantity'
import type { Recipe } from '../domain/types'
import { TONES } from './ui'

export type GridVariant = 'full' | 'compact' | 'mini'

interface Props {
  recipe: Recipe
  factor?: number
  /** Indeks i recipe.steps for aktivt steg. null = ingen utheving. */
  activeIndex?: number | null
  onSelect?: (index: number) => void
  variant?: GridVariant
  layout?: GridLayout
}

const PARTICLES = new Set(['i', 'inn', 'ut', 'opp', 'ned', 'med', 'til', 'sammen'])

/** Kort etikett for svært smale prosesskolonner, uten å ende på «Ha» eller «Rør inn». */
function compactStepLabel(text: string) {
  const words = text.trim().split(/\s+/)
  const count = PARTICLES.has(words[1]?.toLowerCase().replace(/[^a-zæøå]/g, '')) ? 3 : 2
  return words.slice(0, count).join(' ').replace(/[.,;:]+$/, '')
}

export function RecipeGrid({ recipe, factor = 1, activeIndex = null, onSelect, variant = 'full', layout }: Props) {
  const g = useMemo(() => layout ?? buildGrid(recipe), [layout, recipe])
  const nRows = Math.max(1, g.rows.length)
  const activeStepId = activeIndex != null ? recipe.steps[activeIndex]?.id : undefined
  const stepPos = new Map(recipe.steps.map((s, i) => [s.id, i]))
  const compactDense = variant === 'compact' && (g.columns >= 4 || recipe.steps.length >= 5)
  const ingredientWeight = compactDense ? 1.3 : 1.5

  const cols =
    variant === 'full'
      ? `minmax(10rem, 1.35fr) repeat(${g.columns}, minmax(7.5rem, 1fr))`
      : variant === 'compact'
        ? `minmax(0, ${ingredientWeight}fr) repeat(${g.columns}, minmax(0, 1fr))`
        : `1.2fr repeat(${g.columns}, 1fr)`
  const rowH = variant === 'full' ? 'minmax(3.25rem, auto)' : variant === 'compact' ? 'minmax(var(--grid-row-min), auto)' : '0.55rem'
  const gap = variant === 'mini' ? '2px' : variant === 'compact' ? 'var(--grid-gap)' : '4px'

  return (
    <div
      role={variant === 'mini' ? 'img' : 'grid'}
      aria-label={variant === 'mini' ? 'Oversikt over rutenettet' : `Rutenett for ${recipe.title}`}
      className={`recipe-grid grid ${variant === 'compact' ? 'recipe-grid--compact' : ''}`}
      data-dense={compactDense || undefined}
      style={{ gridTemplateColumns: cols, gridTemplateRows: `repeat(${nRows}, ${rowH})`, gap }}
    >
      {g.rows.map((r) => {
        const owner = r.firstStepId ? stepPos.get(r.firstStepId) : undefined
        const isActive = owner != null && owner === activeIndex
        const isUsed = owner != null && activeIndex != null && owner < activeIndex
        const span = r.usedAtCol > 0 ? r.usedAtCol : g.columns + 1
        const amount = formatAmount(r.ingredient.amount, r.ingredient.amountMax, r.ingredient.unit, factor)
        if (variant === 'mini') {
          return (
            <div
              key={r.ingredient.id}
              style={{ gridRow: r.row + 1, gridColumn: `1 / span 1` }}
              className={`rounded-[2px] ${isActive ? 'bg-tomato' : isUsed ? 'bg-line' : 'bg-line-2'}`}
            />
          )
        }
        return (
          <div
            key={r.ingredient.id}
            role="rowheader"
            style={{ gridRow: r.row + 1, gridColumn: `1 / span ${span}` }}
            className={`flex items-center gap-2 rounded-lg transition-colors ${variant === 'full' ? 'px-3 py-2' : 'recipe-grid__ingredient'} ${
              isActive ? 'bg-butter/70 ring-2 ring-butter' : 'bg-card ring-1 ring-line'
            } ${isUsed ? 'opacity-55' : ''} ${r.usedAtCol === 0 ? 'missing' : ''}`}
          >
            <span className={`min-w-0 leading-tight ${variant === 'compact' ? 'recipe-grid__ingredient-text' : 'text-[0.95rem]'} ${isUsed ? 'line-through decoration-ink-3' : ''}`}>
              {amount && <strong className="font-bold whitespace-nowrap tabular-nums">{amount} </strong>}
              <span className={variant === 'compact' ? 'line-clamp-2' : ''}>{r.ingredient.name}</span>
            </span>
            {/* Strek som viser at ingrediensen venter på steget den brukes i */}
            {span > 1 && r.usedAtCol > 1 && <span aria-hidden className="ml-auto h-px min-w-4 flex-1 border-t-2 border-dotted border-line-2" />}
          </div>
        )
      })}

      {g.cells.map((c) => {
        const tone = TONES[c.track % TONES.length]
        const isActive = c.step.id === activeStepId
        const isDone = activeIndex != null && c.index < activeIndex
        const k = c.colEnd - c.col
        // Første kolonne er "arbeid", resten er "venter" (stripet)
        const workShare = `calc(100% / ${k})`
        const bg =
          k > 1
            ? `linear-gradient(to right, ${tone.bg} 0 ${workShare}, transparent ${workShare}), repeating-linear-gradient(135deg, color-mix(in oklab, ${tone.bg} 80%, transparent) 0 5px, color-mix(in oklab, ${tone.bg} 35%, transparent) 5px 10px)`
            : tone.bg
        const style = {
          gridRow: `${c.rowStart + 1} / ${c.rowEnd + 1}`,
          gridColumn: `${c.col + 1} / ${c.colEnd + 1}`,
          background: bg,
          ['--tone' as string]: tone.tone,
        }
        if (variant === 'mini') {
          return (
            <div
              key={c.step.id}
              style={{ ...style, background: isActive ? 'var(--color-tomato)' : bg }}
              className={`rounded-[2px] ${isDone ? 'opacity-40' : ''}`}
            />
          )
        }
        const meta = [
          c.step.durationMin != null && { icon: timeOutline, text: formatMinutes(c.step.durationMin, c.step.durationMaxMin) },
          c.step.temperatureC != null && { icon: flameOutline, text: `${c.step.temperatureC}°` },
        ].filter(Boolean) as { icon: string; text: string }[]
        return (
          <button
            key={c.step.id}
            role="gridcell"
            type="button"
            onClick={() => onSelect?.(c.index)}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Steg ${c.index + 1}: ${c.step.text}`}
            style={style}
            className={`group relative flex flex-col items-start rounded-lg text-left transition-[box-shadow,opacity,transform] duration-200 ${
              variant === 'full' ? 'gap-1 p-2.5' : 'recipe-grid__step gap-0.5'
            } ${isActive ? 'z-10 shadow-lift ring-[3px] ring-tomato' : 'ring-1 ring-[color-mix(in_oklab,var(--tone)_30%,transparent)] hover:ring-2 hover:ring-[var(--tone)]'} ${
              isDone ? 'opacity-55' : ''
            }`}
          >
            <span className={`recipe-grid__step-header flex w-full gap-1.5 ${variant === 'full' ? 'items-center' : 'items-start gap-1'}`}>
              <span
                className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${variant === 'full' ? 'size-6 text-[0.75rem]' : 'recipe-grid__number'}`}
                style={{ background: isActive ? 'var(--color-tomato)' : 'var(--tone)' }}
              >
                {isDone ? <IonIcon icon={checkmark} aria-hidden /> : c.index + 1}
              </span>
              <span
                lang="nb"
                className={`w-full min-w-0 font-display leading-tight font-semibold text-ink ${
                  variant === 'full'
                    ? 'text-[1.05rem]'
                    : 'recipe-grid__step-text break-words hyphens-auto'
                }`}
              >
                {variant === 'full' ? c.step.action : compactDense ? compactStepLabel(c.step.text) : c.step.text}
              </span>
            </span>
            {variant === 'full' && (
              <span lang="nb" className="line-clamp-4 w-full min-w-0 text-[0.86rem] leading-snug text-ink-2">
                {c.step.text}
              </span>
            )}
            {variant === 'full' && meta.length > 0 && (
              <span className="flex flex-wrap gap-x-2 text-[0.8rem] font-bold text-ink-2">
                {meta.map((m) => (
                  <span key={m.text} className="inline-flex items-center gap-0.5">
                    <IonIcon icon={m.icon} aria-hidden /> {m.text}
                  </span>
                ))}
              </span>
            )}
            {variant === 'full' && c.alsoUses.length > 0 && (
              <span className="text-[0.78rem] text-ink-2">+ {c.alsoUses.map((i) => i.name).join(', ')}</span>
            )}
            {variant === 'full' && c.step.produces && (
              <span className="mt-auto text-[0.8rem] italic text-ink-2">→ {c.step.produces}</span>
            )}
            {/* Pil inn mot neste kolonne */}
            {c.consumerId && (
              <span
                aria-hidden
                className="absolute top-1/2 -right-[7px] z-10 size-0 -translate-y-1/2 border-y-[6px] border-l-[7px] border-y-transparent"
                style={{ borderLeftColor: 'var(--tone)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
