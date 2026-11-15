/**
 * Bildelesing: sender bilder til Edge Function-en `smaker-read-recipe`, som
 * lar Claude (Sonnet 5.5) lese oppskriften og svare i fast JSON-form.
 * API-nøkkelen ligger i Supabase, aldri i appen.
 *
 * I demomodus (uten Supabase) finnes ikke bildelesing – da skriver man av selv.
 */
import { draftFromAiRead, type AiRecipeRead } from '../domain/fromAiRead'
import type { RecipeDraft } from '../domain/parseRecipeText'
import { supabase } from './supabase'

export const ocrAvailable = !!supabase

export class NotARecipeError extends Error {
  constructor() {
    super('Vi fant ingen oppskrift på bildet.')
  }
}

export interface ReadResult {
  draft: RecipeDraft
  /** Ord eller deler modellen ikke kunne lese sikkert – vises så de kan sjekkes. */
  uncertain: string[]
}

export async function readRecipeFromImages(dataUrls: string[]): Promise<ReadResult> {
  if (!supabase) throw new Error('Bildelesing krever innlogging.')
  const images = dataUrls.map((u) => {
    const m = u.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
    if (!m) throw new Error('Ukjent bildeformat.')
    return { mediaType: m[1], data: m[2] }
  })
  const { data, error } = await supabase.functions.invoke('smaker-read-recipe', { body: { images } })
  if (error) {
    let message = 'Klarte ikke å lese bildet. Prøv igjen.'
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) message = body.error
    } catch { /* ikke JSON – bruk standardmeldingen */ }
    throw new Error(message)
  }
  const read = data?.recipe as AiRecipeRead | undefined
  if (!read) throw new Error('Fikk ikke noe svar. Prøv igjen.')
  if (!read.isRecipe) throw new NotARecipeError()
  return { draft: draftFromAiRead(read), uncertain: read.uncertain ?? [] }
}
