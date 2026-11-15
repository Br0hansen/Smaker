/**
 * Alt som går via Edge Function-en `smaker-read-recipe`:
 *  - bilder → oppskrift (Claude leser)
 *  - lenke → oppskrift (schema.org-data direkte, ellers leser Claude teksten)
 *  - ingredienser → foreslått fremgangsmåte (merket «Forslag»)
 * API-nøkkelen ligger i Supabase, aldri i appen. I demomodus finnes ikke dette.
 */
import { draftFromAiRead, stepsFromSuggestion, type AiRecipeRead } from '../domain/fromAiRead'
import { draftFromWebRecipe, type WebRecipe } from '../domain/fromWebRecipe'
import type { RecipeDraft } from '../domain/parseRecipeText'
import type { Ingredient, Step } from '../domain/types'
import { supabase } from './supabase'

export const aiAvailable = !!supabase

export class NotARecipeError extends Error {
  constructor(message = 'Vi fant ingen oppskrift her.') {
    super(message)
  }
}

export interface ReadResult {
  draft: RecipeDraft & { coverImage?: string; sourceUrl?: string }
  /** Det modellen ikke kunne lese sikkert, og omregnede mål – vises så det kan sjekkes. */
  uncertain: string[]
  /** «engelsk» osv. når oppskriften er oversatt til norsk. */
  translatedFrom?: string
}

const notes = (r: AiRecipeRead) => ({ uncertain: r.uncertain ?? [], translatedFrom: r.translatedFrom?.trim() || undefined })

async function call<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Dette krever innlogging.')
  const { data, error } = await supabase.functions.invoke('smaker-read-recipe', { body })
  if (error) {
    let message = 'Noe gikk galt. Prøv igjen.'
    try {
      const res = await (error as { context?: Response }).context?.json()
      if (res?.error) message = res.error
    } catch { /* ikke JSON – bruk standardmeldingen */ }
    throw new Error(message)
  }
  return data as T
}

export async function readRecipeFromImages(dataUrls: string[]): Promise<ReadResult> {
  const images = dataUrls.map((u) => {
    const m = u.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
    if (!m) throw new Error('Ukjent bildeformat.')
    return { mediaType: m[1], data: m[2] }
  })
  const data = await call<{ recipe: AiRecipeRead }>({ mode: 'images', images })
  if (!data.recipe?.isRecipe) throw new NotARecipeError('Vi fant ingen oppskrift på bildet. Prøv et skarpere bilde, eller skriv av selv.')
  return { draft: draftFromAiRead(data.recipe), ...notes(data.recipe) }
}

/** Innlimt tekst på et annet språk → Claude leser og oversetter. */
export async function readRecipeFromText(text: string): Promise<ReadResult> {
  const data = await call<{ recipe: AiRecipeRead }>({ mode: 'text', text })
  if (!data.recipe?.isRecipe) throw new NotARecipeError('Vi fant ingen oppskrift i teksten.')
  return { draft: draftFromAiRead(data.recipe), ...notes(data.recipe) }
}

export async function importRecipeFromUrl(url: string): Promise<ReadResult & { source: 'structured' | 'ai' }> {
  const data = await call<{ source: 'structured'; recipe: WebRecipe; url: string } | { source: 'ai'; recipe: AiRecipeRead; url: string }>({ mode: 'url', url })
  if (data.source === 'structured') {
    return { source: 'structured', draft: { ...draftFromWebRecipe(data.recipe), sourceUrl: data.url }, uncertain: [] }
  }
  if (!data.recipe?.isRecipe) throw new NotARecipeError('Vi fant ingen oppskrift på siden. Prøv å kopiere teksten og lime den inn i stedet.')
  return { source: 'ai', draft: { ...draftFromAiRead(data.recipe), sourceUrl: data.url }, ...notes(data.recipe) }
}

export async function suggestSteps(title: string, ingredients: Ingredient[]): Promise<Step[]> {
  const data = await call<{ steps: AiRecipeRead['steps'] }>({
    mode: 'suggest-steps',
    title,
    ingredients: ingredients.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, note: i.note ?? null })),
  })
  return stepsFromSuggestion(data.steps ?? [], ingredients)
}

/** Er teksten bare en lenke? */
export function asUrl(text: string): string | null {
  const t = text.trim()
  if (!/^https?:\/\/\S+$/i.test(t)) return null
  try {
    return new URL(t).toString()
  } catch {
    return null
  }
}
