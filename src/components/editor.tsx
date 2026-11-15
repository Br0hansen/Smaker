/**
 * Felles redigeringsdeler for alle tre innleggingsmetodene (lim inn, bilde,
 * manuelt) og for redigering. Alt jobber på samme datamodell som lagres.
 */
import { IonIcon } from '@ionic/react'
import { add, alertCircleOutline, arrowDown, arrowUp, closeCircle, flameOutline, gitMergeOutline, imageOutline, sparklesOutline, timeOutline, trashOutline } from 'ionicons/icons'
import { useEffect, useRef, useState } from 'react'
import type { RecipeInput } from '../data/store'
import { intermediateLabel } from '../domain/grid'
import { newId } from '../domain/ids'
import { autoLink, extractStepMeta, guessAction } from '../domain/linker'
import { formatAmount, parseIngredientLine } from '../domain/quantity'
import type { Ingredient, Recipe, Step } from '../domain/types'
import { findIssues, type Issue } from '../domain/validate'
import { ClassicView } from './ClassicView'
import { GridView } from './GridView'
import { MissingMark, Segmented } from './ui'

export type Draft = RecipeInput

export function emptyDraft(): Draft {
  return { title: '', servings: 4, categories: [], attachments: [], ingredients: [], steps: [] }
}

// ---------------- Grunninformasjon ----------------

export function BasicsFields({ draft, onChange, full = false }: { draft: Draft; onChange: (d: Draft) => void; full?: boolean }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
  const fileRef = useRef<HTMLInputElement>(null)
  const missingServings = draft.servings == null
  const missingTime = draft.totalMinutes == null

  return (
    <div className="flex flex-col gap-5">
      <Field label="Navn på oppskriften" required>
        <input className="field text-[1.15rem] font-bold" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="F.eks. Bestemors vafler" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Antall porsjoner" hint={missingServings ? <MissingMark>mangler</MissingMark> : undefined}>
          <div className="flex gap-2">
            <input
              className={`field w-24 text-center ${missingServings ? 'missing' : ''}`}
              inputMode="numeric"
              value={draft.servings ?? ''}
              onChange={(e) => set({ servings: e.target.value ? Math.max(1, parseInt(e.target.value, 10) || 1) : null })}
              placeholder="?"
            />
            <input className="field flex-1" value={draft.servingsUnit ?? ''} onChange={(e) => set({ servingsUnit: e.target.value || undefined })} placeholder="porsjoner" />
          </div>
        </Field>
        {full && (
          <Field label="Tid totalt (minutter)" hint={missingTime ? <MissingMark>mangler</MissingMark> : undefined}>
            <input
              className={`field ${missingTime ? 'missing' : ''}`}
              inputMode="numeric"
              value={draft.totalMinutes ?? ''}
              onChange={(e) => set({ totalMinutes: e.target.value ? parseInt(e.target.value, 10) || null : null })}
              placeholder="Ikke oppgitt"
            />
          </Field>
        )}
      </div>

      <Field label="Bilde (valgfritt)">
        <div className="flex items-center gap-3">
          {draft.coverImage ? (
            <div className="relative">
              <img src={draft.coverImage} alt="" className="size-24 rounded-xl object-cover shadow-card" />
              <button className="absolute -top-2 -right-2 text-2xl text-ink" onClick={() => set({ coverImage: undefined })} aria-label="Fjern bilde">
                <IonIcon icon={closeCircle} />
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <IonIcon icon={imageOutline} aria-hidden /> Velg bilde
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) set({ coverImage: await resizeImage(f, 1200) })
            }}
          />
        </div>
      </Field>

      {full && (
        <>
          <Field label="Hvem i familien er den fra? (valgfritt)">
            <input className="field" value={draft.origin ?? ''} onChange={(e) => set({ origin: e.target.value || undefined })} placeholder="F.eks. Bestemor" />
          </Field>
          <Field label="Kort beskrivelse (valgfritt)">
            <input className="field" value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value || undefined })} />
          </Field>
          <Field label="Historien bak (valgfritt)">
            <textarea
              className="field min-h-24 font-display italic"
              value={draft.story ?? ''}
              onChange={(e) => set({ story: e.target.value || undefined })}
              placeholder="Hvem lagde den, og når? Et minne, et triks, en tradisjon …"
            />
          </Field>
          <Field label="Kategorier (skill med komma)">
            <input
              className="field"
              value={draft.categories.join(', ')}
              onChange={(e) => set({ categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder="Middag, Bakst …"
            />
          </Field>
        </>
      )}
    </div>
  )
}

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 font-bold text-ink-2">
        {label}
        {required && <span className="text-tomato" aria-label="påkrevd">*</span>}
        {hint}
      </span>
      {children}
    </label>
  )
}

// ---------------- Ingredienser ----------------

function toRaw(i: Ingredient): string {
  return [formatAmount(i.amount, i.amountMax, i.unit), i.name, i.note ? `, ${i.note}` : ''].filter(Boolean).join(' ').replace(' ,', ',')
}

/**
 * Én tekstlinje per ingrediens – "2 dl melk" – som tolkes mens du skriver.
 * En tom rad ligger alltid nederst, så det er bare å fortsette å skrive.
 */
export function IngredientsEditor({ ingredients, onChange }: { ingredients: Ingredient[]; onChange: (ings: Ingredient[]) => void }) {
  const [raw, setRaw] = useState<Record<string, string>>(() => Object.fromEntries(ingredients.map((i) => [i.id, toRaw(i)])))
  const [blankId, setBlankId] = useState(() => newId())
  const refs = useRef<Record<string, HTMLInputElement | null>>({})
  const focusNext = useRef<string | null>(null)

  useEffect(() => {
    if (focusNext.current) {
      refs.current[focusNext.current]?.focus()
      focusNext.current = null
    }
  })

  const update = (id: string, text: string) => {
    setRaw((r) => ({ ...r, [id]: text }))
    const p = parseIngredientLine(text)
    const fields = { name: p.name || text.trim(), amount: p.amount, amountMax: p.amountMax, unit: p.unit, note: p.note }
    if (id === blankId) {
      if (!text.trim()) return
      onChange([...ingredients, { id, ...fields }])
      setBlankId(newId())
    } else {
      onChange(ingredients.map((i) => (i.id === id ? { ...i, ...fields } : i)))
    }
  }
  const removeRow = (id: string) => onChange(ingredients.filter((i) => i.id !== id))

  const rows = [...ingredients.map((i) => i.id), blankId]
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.92rem] text-ink-2">
        Skriv mengde og ingrediens på samme linje, f.eks. <em>«2 dl melk»</em>, <em>«1½ ts salt»</em> eller <em>«2–3 fedd hvitløk»</em>.
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((id, k) => {
          const ing = ingredients.find((i) => i.id === id)
          const amount = ing ? formatAmount(ing.amount, ing.amountMax, ing.unit) : ''
          return (
            <li key={id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => { refs.current[id] = el }}
                  className={`field ${!ing ? 'bg-paper shadow-[inset_0_0_0_1.5px_var(--color-line)] [border-style:dashed]' : ''}`}
                  value={raw[id] ?? (ing ? toRaw(ing) : '')}
                  onChange={(e) => update(id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      focusNext.current = rows[k + 1] ?? blankId
                      refs.current[focusNext.current]?.focus()
                    }
                  }}
                  placeholder={ing ? '' : k === 0 ? 'F.eks. 400 g kyllingfilet' : 'Ny ingrediens …'}
                  aria-label={ing ? `Ingrediens ${k + 1}` : 'Ny ingrediens'}
                />
                {ing && (
                  <button className="btn btn-ghost size-11 shrink-0 p-0" onClick={() => removeRow(id)} aria-label={`Fjern ${ing.name}`}>
                    <IonIcon icon={trashOutline} className="text-xl" />
                  </button>
                )}
              </div>
              {ing && (
                <div className="flex flex-wrap items-center gap-1.5 pl-1 text-[0.82rem]">
                  {amount ? <span className="chip min-h-6 bg-sage-soft px-2 text-[0.8rem] text-ink">{amount}</span> : <MissingMark>ingen mengde</MissingMark>}
                  <span className="chip min-h-6 bg-paper-2 px-2 text-[0.8rem]">{ing.name}</span>
                  {ing.note && <span className="text-ink-3">{ing.note}</span>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------- Fremgangsmåte ----------------

export function StepsEditor({
  steps,
  ingredients,
  onChange,
}: {
  steps: Step[]
  ingredients: Ingredient[]
  onChange: (steps: Step[]) => void
}) {
  // Steg der brukeren har koblet selv, røres ikke av automatikken
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const touch = (id: string) => setTouched((t) => new Set(t).add(id))

  const relink = (list: Step[], force = false) => {
    const linked = autoLink(ingredients, list.map((s) => ({ id: s.id, text: s.text })))
    return list.map((s, i) => {
      if (!force && touched.has(s.id)) return s
      const l = linked[i]
      return { ...s, inputs: l.inputs, action: s.action || l.action, durationMin: s.durationMin ?? l.durationMin, durationMaxMin: s.durationMaxMin ?? l.durationMaxMin, temperatureC: s.temperatureC ?? l.temperatureC }
    })
  }

  const patch = (id: string, p: Partial<Step>) => onChange(steps.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const addStep = () => onChange([...steps, { id: newId(), text: '', action: '', inputs: [] }])
  const removeStep = (id: string) =>
    onChange(steps.filter((s) => s.id !== id).map((s) => ({ ...s, inputs: s.inputs.filter((x) => !(x.kind === 'step' && x.id === id)) })))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[i], next[j]] = [next[j], next[i]]
    // Et steg kan bare bygge på steg som kommer før – rydd bort ugyldige koblinger
    onChange(next.map((s, k) => ({ ...s, inputs: s.inputs.filter((x) => x.kind === 'ingredient' || next.findIndex((y) => y.id === x.id) < k) })))
  }
  const toggleInput = (step: Step, kind: 'ingredient' | 'step', id: string) => {
    touch(step.id)
    const has = step.inputs.some((x) => x.kind === kind && x.id === id)
    patch(step.id, { inputs: has ? step.inputs.filter((x) => !(x.kind === kind && x.id === id)) : [...step.inputs, { kind, id }] })
  }

  const ownerOf = new Map<string, number>()
  steps.forEach((s, i) => s.inputs.forEach((x) => x.kind === 'ingredient' && !ownerOf.has(x.id) && ownerOf.set(x.id, i)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[0.92rem] text-ink-2">
          Skriv ett steg om gangen. Ingredienser kobles automatisk når de nevnes – trykk på dem for å rette.
        </p>
        {steps.length > 1 && (
          <button className="btn btn-secondary min-h-10 text-[0.9rem]" onClick={() => { setTouched(new Set()); onChange(relink(steps, true)) }}>
            <IonIcon icon={sparklesOutline} aria-hidden /> Foreslå koblinger på nytt
          </button>
        )}
      </div>

      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="mt-2 grid size-9 shrink-0 place-items-center rounded-full bg-tomato-soft font-display text-lg font-semibold text-tomato">{i + 1}</span>
              <textarea
                className="field min-h-20 flex-1 text-[1.05rem]"
                value={s.text}
                onChange={(e) => patch(s.id, { text: e.target.value })}
                onBlur={() => {
                  if (!s.text.trim()) return
                  const meta = extractStepMeta(s.text)
                  const filled = steps.map((x) =>
                    x.id === s.id
                      ? { ...x, action: x.action || guessAction(x.text), durationMin: x.durationMin ?? meta.durationMin, durationMaxMin: x.durationMaxMin ?? meta.durationMaxMin, temperatureC: x.temperatureC ?? meta.temperatureC }
                      : x,
                  )
                  onChange(relink(filled))
                }}
                placeholder={i === 0 ? 'F.eks. Skjær kyllingen i terninger.' : 'Hva gjør du så?'}
                aria-label={`Steg ${i + 1}`}
              />
              <div className="flex flex-col">
                <button className="btn btn-ghost size-9 min-h-9 p-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Flytt opp">
                  <IonIcon icon={arrowUp} />
                </button>
                <button className="btn btn-ghost size-9 min-h-9 p-0" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Flytt ned">
                  <IonIcon icon={arrowDown} />
                </button>
                <button className="btn btn-ghost size-9 min-h-9 p-0" onClick={() => removeStep(s.id)} aria-label={`Slett steg ${i + 1}`}>
                  <IonIcon icon={trashOutline} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pl-12">
              <MiniField label="Handling i rutenettet" width="w-36">
                <input className="field min-h-10 py-1.5" value={s.action} onChange={(e) => patch(s.id, { action: e.target.value })} placeholder={guessAction(s.text || 'Steg')} />
              </MiniField>
              <MiniField label={<><IonIcon icon={timeOutline} aria-hidden /> Minutter</>} width="w-28">
                <input
                  className="field min-h-10 py-1.5"
                  inputMode="numeric"
                  value={s.durationMin ?? ''}
                  onChange={(e) => patch(s.id, { durationMin: e.target.value ? parseInt(e.target.value, 10) || null : null, durationMaxMin: null })}
                  placeholder="–"
                />
              </MiniField>
              <MiniField label={<><IonIcon icon={flameOutline} aria-hidden /> °C</>} width="w-24">
                <input
                  className="field min-h-10 py-1.5"
                  inputMode="numeric"
                  value={s.temperatureC ?? ''}
                  onChange={(e) => patch(s.id, { temperatureC: e.target.value ? parseInt(e.target.value, 10) || null : null })}
                  placeholder="–"
                />
              </MiniField>
            </div>

            {(ingredients.length > 0 || i > 0) && (
              <div className="flex flex-col gap-2 pl-12">
                {ingredients.length > 0 && (
                  <ChipGroup label="Ingredienser i steget">
                    {ingredients.map((ing) => {
                      const on = s.inputs.some((x) => x.kind === 'ingredient' && x.id === ing.id)
                      const elsewhere = !on && ownerOf.has(ing.id)
                      return (
                        <button
                          key={ing.id}
                          onClick={() => toggleInput(s, 'ingredient', ing.id)}
                          aria-pressed={on}
                          className={`chip min-h-8 text-[0.85rem] ${on ? 'bg-sage text-white' : elsewhere ? 'bg-paper text-ink-3' : 'bg-paper-2 text-ink-2 ring-1 ring-line'}`}
                          title={elsewhere ? `Brukes i steg ${ownerOf.get(ing.id)! + 1}` : undefined}
                        >
                          {ing.name}
                        </button>
                      )
                    })}
                  </ChipGroup>
                )}
                {i > 0 && (
                  <ChipGroup label={<><IonIcon icon={gitMergeOutline} aria-hidden /> Bygger videre på</>}>
                    {steps.slice(0, i).map((prev, j) => {
                      const on = s.inputs.some((x) => x.kind === 'step' && x.id === prev.id)
                      return (
                        <button
                          key={prev.id}
                          onClick={() => toggleInput(s, 'step', prev.id)}
                          aria-pressed={on}
                          className={`chip min-h-8 text-[0.85rem] ${on ? 'bg-plum text-white' : 'bg-paper-2 text-ink-2 ring-1 ring-line'}`}
                        >
                          {j + 1}. {prev.produces || prev.action || intermediateLabel(prev, j)}
                        </button>
                      )
                    })}
                  </ChipGroup>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>

      <button className="btn btn-secondary min-h-14 border-2 border-dashed border-line-2 bg-transparent shadow-none" onClick={addStep}>
        <IonIcon icon={add} aria-hidden className="text-xl" /> Legg til steg
      </button>
    </div>
  )
}

function MiniField({ label, children, width }: { label: React.ReactNode; children: React.ReactNode; width: string }) {
  return (
    <label className={`flex flex-col gap-1 ${width}`}>
      <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-ink-3">{label}</span>
      {children}
    </label>
  )
}

function ChipGroup({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-ink-3">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

// ---------------- Forhåndsvisning og mangler ----------------

export function IssueList({ issues }: { issues: Issue[] }) {
  const shown = issues.filter((i) => i.level !== 'hint')
  const hints = issues.filter((i) => i.level === 'hint')
  if (!issues.length) return null
  return (
    <div className="missing flex flex-col gap-1 rounded-2xl p-4">
      <div className="flex items-center gap-2 font-bold text-saffron">
        <IonIcon icon={alertCircleOutline} aria-hidden /> Sjekk dette før du lagrer
      </div>
      <ul className="list-disc pl-6 text-ink-2">
        {shown.map((i, k) => (
          <li key={k} className={i.level === 'required' ? 'font-bold text-tomato' : ''}>{i.message}</li>
        ))}
        {hints.length > 0 && <li>{hints.length === 1 ? hints[0].message : `${hints.length} ingredienser er ikke koblet til noe steg.`}</li>}
      </ul>
      <p className="mt-1 text-[0.85rem] text-ink-3">Vi fyller aldri inn mengder eller tider selv. Du kan lagre likevel og fylle inn senere.</p>
    </div>
  )
}

export function draftToPreview(d: Draft): Recipe {
  return {
    ...d,
    id: d.id ?? 'preview',
    familyId: 'preview',
    createdBy: '',
    createdAt: '',
    updatedBy: '',
    updatedAt: '',
    version: 0,
  }
}

export function RecipePreview({ draft }: { draft: Draft }) {
  const [view, setView] = useState<'classic' | 'grid'>('classic')
  const recipe = draftToPreview(draft)
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Forhåndsvisning"
        value={view}
        onChange={setView}
        options={[
          { value: 'classic', label: 'Oppskrift' },
          { value: 'grid', label: 'Recipe Grid' },
        ]}
      />
      {recipe.steps.length === 0 ? (
        <p className="text-ink-2">Legg til steg for å se forhåndsvisningen.</p>
      ) : view === 'classic' ? (
        <ClassicView recipe={recipe} factor={1} />
      ) : (
        <GridView recipe={recipe} factor={1} />
      )}
    </div>
  )
}

export { findIssues }

// ---------------- Bilder ----------------

/** Krymper bildet før lagring, så kokeboka ikke fyller telefonen. */
export async function resizeImage(file: File, maxSide: number): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
