/**
 * Gjør svaret fra bildemodellen om til et oppskriftsutkast.
 *
 * Modellen refererer til ingredienser og steg med indekser (0, 1, 2 …), ikke
 * ID-er – den skal ikke finne på UUID-er. Her får alt ekte ID-er, ugyldige
 * koblinger fjernes, og hvis modellen ikke koblet noe, foreslår den vanlige
 * automatikken (linker.ts) koblinger, akkurat som ved innliming av tekst.
 */
import { newId } from './ids'
import { autoLink, guessAction } from './linker'
import type { RecipeDraft } from './parseRecipeText'
import { normalizeUnit } from './quantity'
import type { Ingredient, Step, StepInput } from './types'

/** Formen Edge Function-en returnerer (samme som skjemaet modellen får). */
export interface AiRecipeRead {
  isRecipe: boolean
  title: string
  description: string | null
  servings: number | null
  servingsUnit: string | null
  totalMinutes: number | null
  prepMinutes: number | null
  categories: string[]
  ingredients: {
    name: string
    amount: number | null
    amountMax: number | null
    unit: string | null
    note: string | null
    group: string | null
  }[]
  steps: {
    text: string
    action: string
    ingredientIndexes: number[]
    buildsOnSteps: number[]
    produces: string | null
    durationMin: number | null
    durationMaxMin: number | null
    temperatureC: number | null
  }[]
  /** Ord eller deler modellen ikke kunne lese sikkert, og mål som er regnet om. */
  uncertain: string[]
  /** Språket originalen var på («engelsk»), hvis den ble oversatt. */
  translatedFrom?: string | null
}

const clean = (s: string | null | undefined) => {
  const t = s?.trim()
  return t ? t : undefined
}
const positive = (n: number | null | undefined) => (n != null && Number.isFinite(n) && n >= 0 ? n : null)

export function draftFromAiRead(read: AiRecipeRead): RecipeDraft {
  const ingredients: Ingredient[] = read.ingredients
    .filter((i) => i.name?.trim())
    .map((i) => {
      const amount = positive(i.amount)
      const amountMax = positive(i.amountMax)
      return {
        id: newId(),
        name: i.name.trim(),
        amount,
        amountMax: amount != null && amountMax != null && amountMax > amount ? amountMax : null,
        // Kjente enheter normaliseres; ukjente (f.eks. «kopp», «pund») beholdes som de står
        unit: i.unit?.trim() ? (normalizeUnit(i.unit.trim()) ?? i.unit.trim()) : null,
        note: clean(i.note),
        group: clean(i.group),
      }
    })
  // Indekser i modellens liste → ID-er (filtreringen over kan ha fjernet tomme rader)
  const ingIdByIndex = new Map<number, string>()
  let k = 0
  read.ingredients.forEach((i, idx) => {
    if (i.name?.trim()) ingIdByIndex.set(idx, ingredients[k++].id)
  })

  const steps = stepsFromAi(read.steps, ingredients, ingIdByIndex)

  return {
    title: read.title?.trim() ?? '',
    description: clean(read.description),
    servings: positive(read.servings) || null,
    servingsUnit: clean(read.servingsUnit),
    totalMinutes: positive(read.totalMinutes),
    prepMinutes: positive(read.prepMinutes),
    categories: [...new Set((read.categories ?? []).map((c) => c.trim()).filter(Boolean))].slice(0, 4),
    ingredients,
    steps,
  }
}

type AiStep = AiRecipeRead['steps'][number]

/**
 * Modellens steg (med indekser) → appens steg (med ID-er og gyldige koblinger).
 * Brukes både for avlest oppskrift og for foreslått fremgangsmåte.
 */
function stepsFromAi(aiSteps: AiStep[], ingredients: Ingredient[], ingIdByIndex: Map<number, string>, suggested = false): Step[] {
  const rawSteps = aiSteps.filter((s) => s.text?.trim())
  const stepIds = rawSteps.map(() => newId())

  let steps: Step[] = rawSteps.map((s, i) => {
    const inputs: StepInput[] = []
    for (const j of s.buildsOnSteps ?? []) {
      // Bare tidligere steg – ellers kunne grafen fått sirkler
      if (Number.isInteger(j) && j >= 0 && j < i && !inputs.some((x) => x.id === stepIds[j])) {
        inputs.push({ kind: 'step', id: stepIds[j] })
      }
    }
    for (const j of s.ingredientIndexes ?? []) {
      const id = ingIdByIndex.get(j)
      if (id && !inputs.some((x) => x.id === id)) inputs.push({ kind: 'ingredient', id })
    }
    const min = positive(s.durationMin)
    const max = positive(s.durationMaxMin)
    return {
      id: stepIds[i],
      text: s.text.trim(),
      action: clean(s.action) ?? guessAction(s.text),
      inputs,
      produces: clean(s.produces),
      durationMin: min,
      durationMaxMin: min != null && max != null && max > min ? max : null,
      temperatureC: s.temperatureC ?? null,
      ...(suggested ? { suggested: true } : {}),
    }
  })

  // Modellen koblet ingenting? Bruk samme automatikk som for innlimt tekst.
  if (steps.length > 0 && steps.every((s) => s.inputs.length === 0)) {
    const linked = autoLink(ingredients, steps.map((s) => ({ id: s.id, text: s.text, action: s.action })))
    steps = steps.map((s, i) => ({ ...s, inputs: linked[i].inputs }))
  }
  return steps
}

/**
 * Foreslått fremgangsmåte fra Claude → steg merket «Forslag».
 * Indeksene viser til rekkefølgen ingrediensene ble sendt i. Tider og
 * temperaturer fjernes uansett – de skal ikke gjettes.
 */
export function stepsFromSuggestion(aiSteps: AiStep[], ingredients: Ingredient[]): Step[] {
  const ingIdByIndex = new Map(ingredients.map((ing, i) => [i, ing.id] as const))
  return stepsFromAi(aiSteps, ingredients, ingIdByIndex, true).map((s) => ({ ...s, durationMin: null, durationMaxMin: null, temperatureC: null }))
}
