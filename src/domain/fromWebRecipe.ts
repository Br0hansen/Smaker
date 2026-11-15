/**
 * Oppskriftsdata fra en nettside (schema.org/Recipe, hentet av Edge Function-en)
 * → oppskriftsutkast. Ingen språkmodell: ingredienslinjene tolkes med samme
 * tolker som innlimt tekst, og stegene kobles automatisk.
 */
import { newId } from './ids'
import { autoLink } from './linker'
import type { RecipeDraft } from './parseRecipeText'
import { parseIngredientLine } from './quantity'
import type { Ingredient } from './types'

export interface WebRecipe {
  name: string
  description: string | null
  ingredients: string[]
  instructions: string[]
  yield: string | null
  totalMinutes: number | null
  prepMinutes: number | null
  categories: string[]
  image: string | null
}

/** «4 porsjoner», «10 stk», «Gir 12 boller», «4» → { 4, "porsjoner" } */
export function parseYield(y: string | null): { servings: number | null; unit?: string } {
  if (!y) return { servings: null }
  const m = y.match(/(\d+)\s*(?:[-–]\s*\d+\s*)?([\p{L}]+)?/u)
  if (!m) return { servings: null }
  const word = m[2]?.toLowerCase()
  const unit = !word || /^(porsjon|porsjoner|personer|pers|servings?|people|stk)$/.test(word) ? 'porsjoner' : word
  return { servings: parseInt(m[1], 10) || null, unit }
}

export function draftFromWebRecipe(web: WebRecipe): RecipeDraft & { coverImage?: string } {
  const ingredients: Ingredient[] = web.ingredients.map((line) => {
    const p = parseIngredientLine(line)
    return { id: newId(), name: p.name || line, amount: p.amount, amountMax: p.amountMax, unit: p.unit, note: p.note }
  })
  const steps = autoLink(
    ingredients,
    web.instructions.filter((t) => t.trim()).map((text) => ({ id: newId(), text: text.trim() })),
  )
  const { servings, unit } = parseYield(web.yield)
  return {
    title: web.name.trim(),
    description: web.description?.trim() || undefined,
    servings,
    servingsUnit: unit,
    totalMinutes: web.totalMinutes,
    prepMinutes: web.prepMinutes,
    categories: web.categories,
    ingredients,
    steps,
    coverImage: web.image && /^https:\/\//.test(web.image) ? web.image : undefined,
  }
}
