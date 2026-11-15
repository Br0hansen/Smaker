/**
 * Recipe Grid – beregner layouten for rutenettet fra oppskriftsgrafen.
 *
 * Inspirert av Cooking for Engineers:
 *   - Venstre kolonne: én rad per ingrediens.
 *   - Hvert steg er en celle som dekker radene til ALLE ingrediensene som
 *     (direkte eller via mellomprodukter) flyter inn i det.
 *   - Kolonne = "dybde" i prosessen: et steg står én kolonne til høyre for
 *     det dypeste steget det bygger på.
 *   - En celle strekker seg mot høyre helt til steget som bruker resultatet.
 *     Slik ser man at pasta koker (lang celle) mens sausen lages (flere korte).
 *
 * Ingenting her lagres – alt utledes fra Recipe.ingredients og Recipe.steps.
 */
import type { Id, Ingredient, Recipe, Step } from './types'

export interface GridIngredientRow {
  ingredient: Ingredient
  row: number
  /** Kolonnen der ingrediensen tas i bruk (cellen strekker seg dit). 0 = ikke brukt. */
  usedAtCol: number
  /** Steget som tar ingrediensen i bruk først. */
  firstStepId: Id | null
}

export interface GridStepCell {
  step: Step
  /** Indeks i recipe.steps – brukes for "aktivt steg" og navigasjon. */
  index: number
  col: number
  /** Eksklusiv slutt-kolonne (CSS grid-column-end). */
  colEnd: number
  rowStart: number
  /** Eksklusiv slutt-rad. */
  rowEnd: number
  /** Spor (gren) – brukes til farge, slik at parallelle prosesser skiller seg ut. */
  track: number
  /** Ingredienser som også nevnes her, men som "eies" av et tidligere steg. */
  alsoUses: Ingredient[]
  /** Steget som bruker resultatet videre. null = sluttresultat. */
  consumerId: Id | null
}

export interface GridLayout {
  rows: GridIngredientRow[]
  cells: GridStepCell[]
  /** Antall stegkolonner (ingredienskolonnen kommer i tillegg). */
  columns: number
  /** Steg uten ingredienser, f.eks. "Forvarm ovnen til 200 °C". */
  prepSteps: { step: Step; index: number }[]
  warnings: string[]
}

export function buildGrid(recipe: Recipe): GridLayout {
  const { steps, ingredients } = recipe
  const warnings: string[] = []
  const stepIndex = new Map<Id, number>(steps.map((s, i) => [s.id, i]))
  const ingById = new Map<Id, Ingredient>(ingredients.map((i) => [i.id, i]))

  // 1. Rens input: bare tidligere steg kan brukes (hindrer sirkler).
  const stepInputs = new Map<Id, Id[]>()
  const ingInputs = new Map<Id, Id[]>()
  steps.forEach((s, i) => {
    const sIn: Id[] = []
    const iIn: Id[] = []
    for (const inp of s.inputs) {
      if (inp.kind === 'step') {
        const j = stepIndex.get(inp.id)
        if (j !== undefined && j < i) sIn.push(inp.id)
      } else if (ingById.has(inp.id)) {
        iIn.push(inp.id)
      }
    }
    stepInputs.set(s.id, sIn)
    ingInputs.set(s.id, iIn)
  })

  // 2. Hvem eier hver ingrediens? Det første steget som bruker den.
  const ingOwner = new Map<Id, Id>()
  for (const s of steps) {
    for (const ingId of ingInputs.get(s.id)!) {
      if (!ingOwner.has(ingId)) ingOwner.set(ingId, s.id)
    }
  }

  // 3. Forberedelsessteg: steg der ingen ingredienser flyter inn (direkte eller indirekte).
  const hasIngredients = new Map<Id, boolean>()
  for (const s of steps) {
    const own = ingInputs.get(s.id)!.some((id) => ingOwner.get(id) === s.id)
    const viaSteps = stepInputs.get(s.id)!.some((id) => hasIngredients.get(id))
    hasIngredients.set(s.id, own || viaSteps)
  }
  const prepSteps = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !hasIngredients.get(step.id))
  const isGridStep = (id: Id) => hasIngredients.get(id) === true

  // 4. Hvem bruker resultatet av hvert steg? Ett steg skal ha én mottaker.
  const consumer = new Map<Id, Id>()
  for (const s of steps) {
    if (!isGridStep(s.id)) continue
    for (const inId of stepInputs.get(s.id)!) {
      if (!isGridStep(inId)) continue
      if (consumer.has(inId)) {
        warnings.push(`Resultatet av steg ${stepIndex.get(inId)! + 1} brukes i flere steg. Rutenettet viser bare det første.`)
        continue
      }
      consumer.set(inId, s.id)
    }
  }
  const children = (id: Id) => stepInputs.get(id)!.filter((c) => isGridStep(c) && consumer.get(c) === id)

  // 5. Kolonner: 1 + dypeste barn.
  const col = new Map<Id, number>()
  for (const s of steps) {
    if (!isGridStep(s.id)) continue
    const kids = children(s.id)
    col.set(s.id, 1 + Math.max(0, ...kids.map((k) => col.get(k)!)))
  }
  const columns = Math.max(0, ...col.values())

  // 6. Rader: dybde-først fra hvert sluttresultat, så hver delprosess får sammenhengende rader.
  const rowOf = new Map<Id, number>()
  const range = new Map<Id, [number, number]>()
  let nextRow = 0
  const visit = (id: Id) => {
    const start = nextRow
    // Følg rekkefølgen i input-listen, så brukeren styrer rekkefølgen i rutenettet.
    const s = steps[stepIndex.get(id)!]
    for (const inp of s.inputs) {
      if (inp.kind === 'step' && consumer.get(inp.id) === id && isGridStep(inp.id)) visit(inp.id)
      if (inp.kind === 'ingredient' && ingOwner.get(inp.id) === id && !rowOf.has(inp.id)) {
        rowOf.set(inp.id, nextRow++)
      }
    }
    range.set(id, [start, nextRow])
  }
  const roots = steps.filter((s) => isGridStep(s.id) && !consumer.has(s.id))
  roots.forEach((r) => visit(r.id))

  // Ingredienser som ikke er koblet til noe steg havner nederst.
  const unused = ingredients.filter((i) => !rowOf.has(i.id))
  unused.forEach((i) => rowOf.set(i.id, nextRow++))
  if (unused.length) {
    warnings.push(
      unused.length === 1
        ? `«${unused[0].name}» er ikke koblet til noe steg.`
        : `${unused.length} ingredienser er ikke koblet til noe steg.`,
    )
  }

  // 7. Spor (farger): et steg arver sporet til første barn; nye grener får nytt spor.
  const track = new Map<Id, number>()
  let nextTrack = 0
  for (const s of steps) {
    if (!isGridStep(s.id)) continue
    const kids = children(s.id)
    track.set(s.id, kids.length ? track.get(kids[0])! : nextTrack++)
  }

  const rows: GridIngredientRow[] = ingredients
    .map((ingredient) => {
      const owner = ingOwner.get(ingredient.id) ?? null
      return {
        ingredient,
        row: rowOf.get(ingredient.id)!,
        usedAtCol: owner && isGridStep(owner) ? col.get(owner)! : 0,
        firstStepId: owner,
      }
    })
    .sort((a, b) => a.row - b.row)

  const cells: GridStepCell[] = steps.flatMap((step, index) => {
    if (!isGridStep(step.id)) return []
    const cons = consumer.get(step.id) ?? null
    const [rowStart, rowEnd] = range.get(step.id)!
    if (rowEnd === rowStart) {
      // Kan skje når et mellomprodukt brukes flere steder – vis steget som forberedelse.
      prepSteps.push({ step, index })
      return []
    }
    return [{
      step,
      index,
      col: col.get(step.id)!,
      colEnd: cons ? col.get(cons)! : columns + 1,
      rowStart,
      rowEnd,
      track: track.get(step.id)!,
      alsoUses: ingInputs
        .get(step.id)!
        .filter((id) => ingOwner.get(id) !== step.id)
        .map((id) => ingById.get(id)!),
      consumerId: cons,
    }]
  })

  prepSteps.sort((a, b) => a.index - b.index)
  return { rows, cells, columns, prepSteps, warnings }
}

/** Alt som går inn i ett steg – brukt av fokusvisning og matlagingsmodus. */
export interface StepInputs {
  ingredients: Ingredient[]
  intermediates: { step: Step; index: number; label: string }[]
}

export function inputsForStep(recipe: Recipe, stepId: Id): StepInputs {
  const idx = recipe.steps.findIndex((s) => s.id === stepId)
  const step = recipe.steps[idx]
  if (!step) return { ingredients: [], intermediates: [] }
  const ingById = new Map(recipe.ingredients.map((i) => [i.id, i]))
  const ingredients: Ingredient[] = []
  const intermediates: StepInputs['intermediates'] = []
  for (const inp of step.inputs) {
    if (inp.kind === 'ingredient') {
      const ing = ingById.get(inp.id)
      if (ing) ingredients.push(ing)
    } else {
      const j = recipe.steps.findIndex((s) => s.id === inp.id)
      if (j >= 0 && j < idx) {
        const src = recipe.steps[j]
        intermediates.push({ step: src, index: j, label: intermediateLabel(src, j) })
      }
    }
  }
  intermediates.sort((a, b) => a.index - b.index)
  return { ingredients, intermediates }
}

export function intermediateLabel(step: Step, index: number): string {
  return step.produces?.trim() || `${step.action || 'Resultatet'} (steg ${index + 1})`
}
