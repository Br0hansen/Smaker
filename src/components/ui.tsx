import { IonIcon } from '@ionic/react'
import { add, remove } from 'ionicons/icons'
import type { ReactNode } from 'react'
import type { FamilyMember, Recipe } from '../domain/types'

/** Fargepar for omslag og spor i rutenettet. */
export const TONES = [
  { tone: 'var(--color-sage)', bg: 'var(--color-sage-soft)' },
  { tone: 'var(--color-saffron)', bg: 'var(--color-saffron-soft)' },
  { tone: 'var(--color-plum)', bg: 'var(--color-plum-soft)' },
  { tone: 'var(--color-sea)', bg: 'var(--color-sea-soft)' },
  { tone: 'var(--color-tomato)', bg: 'var(--color-tomato-soft)' },
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/**
 * Omslag: bildet hvis det finnes, ellers en rutete duk med en etikett.
 * Gir hver oppskrift et eget, gjenkjennelig utseende uten at noen må ta bilde.
 */
export function RecipeCover({ recipe, className = '', large = false }: { recipe: Pick<Recipe, 'id' | 'title' | 'coverImage'>; className?: string; large?: boolean }) {
  if (recipe.coverImage) {
    return <img src={recipe.coverImage} alt="" className={`size-full object-cover ${className}`} />
  }
  const t = TONES[hash(recipe.id) % TONES.length]
  const initial = recipe.title.trim().replace(/^(bestemors|mammas|pappas|mormors|farmors|morfars|farfars|tantes|onkels)\s+/i, '')[0] ?? '?'
  return (
    <div
      aria-hidden
      className={`gingham grid size-full place-items-center ${className}`}
      style={{ ['--tone' as string]: t.tone, ['--tone-bg' as string]: t.bg }}
    >
      <span
        className={`grid place-items-center rounded-[40%] bg-card font-display font-medium italic text-ink shadow-card ${large ? 'size-28 text-6xl' : 'size-16 text-4xl'}`}
        style={{ color: t.tone }}
      >
        {initial.toUpperCase()}
      </span>
    </div>
  )
}

export function Avatar({ member, size = 'md' }: { member?: FamilyMember; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'size-6 text-[0.7rem]' : size === 'lg' ? 'size-12 text-lg' : 'size-8 text-sm'
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${s}`}
      style={{ background: member?.color ?? 'var(--color-ink-3)' }}
    >
      {member?.name[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

export function ServingsStepper({
  value,
  onChange,
  unit = 'porsjoner',
  size = 'md',
}: {
  value: number
  onChange: (n: number) => void
  unit?: string
  size?: 'md' | 'lg'
}) {
  const btn = size === 'lg' ? 'size-12 text-2xl' : 'size-10 text-xl'
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-[inset_0_0_0_1.5px_var(--color-line)]" role="group" aria-label="Antall porsjoner">
      <button className={`grid place-items-center rounded-full text-ink-2 hover:bg-paper-2 disabled:opacity-30 ${btn}`} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Færre">
        <IonIcon icon={remove} />
      </button>
      <span className={`min-w-[5.5rem] text-center font-bold tabular-nums ${size === 'lg' ? 'text-lg' : ''}`} aria-live="polite">
        {value} {unit}
      </span>
      <button className={`grid place-items-center rounded-full text-ink-2 hover:bg-paper-2 ${btn}`} onClick={() => onChange(value + 1)} aria-label="Flere">
        <IonIcon icon={add} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full bg-paper-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full font-bold transition-colors ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} ${
            o.value === value ? 'bg-card text-ink shadow-card' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function MissingMark({ children }: { children: ReactNode }) {
  return (
    <span className="missing inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.78rem] font-bold text-saffron">
      {children}
    </span>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-[1.45rem] font-semibold">{children}</h2>
      {action}
    </div>
  )
}
