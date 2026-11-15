/**
 * smaker-read-recipe – henter oppskrifter inn i Smaker. Tre moduser (body.mode):
 *  - "images" (standard): leser 1–4 bilder (skjermbilder, kokebokssider,
 *    håndskrevne kort) med Claude.
 *  - "url": henter en nettside. Har den schema.org/Recipe-data (de fleste
 *    oppskriftssider), brukes den direkte – uten språkmodell. Ellers leser
 *    Claude teksten (f.eks. en TikTok-beskrivelse).
 *  - "suggest-steps": foreslår fremgangsmåte når originalen bare har ingredienser.
 *
 * Sikkerhet og kostnad:
 *  - Krever innlogget bruker (JWT sjekkes av Supabase) som er med i en familie.
 *  - Døgngrense per bruker (DAILY_LIMIT), logget i smaker_ai_usage.
 *  - API-nøkkelen ligger som hemmelighet (ANTHROPIC_API_KEY) – aldri i appen.
 *
 * Modellkallet ligger i én funksjon (askClaude), så en annen leverandør
 * kan legges til ved siden av for sammenligning uten å røre resten.
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { fetchPage, pageText, ReadError, structuredRecipe } from './web.ts'

const MODEL = 'claude-sonnet-5-5'
const DAILY_LIMIT = 40
const MAX_IMAGES = 4
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const ALLOWED_ORIGINS = ['https://br0hansen.github.io', 'http://localhost:5173', 'http://localhost:4173']

// ---------------- Skjemaet modellen må svare i ----------------

const Ingredient = z.object({
  name: z.string().describe('Ingrediensen uten mengde, f.eks. «hvetemel»'),
  amount: z.number().nullable().describe('Mengde som tall (½ → 0.5). null hvis ikke oppgitt'),
  amountMax: z.number().nullable().describe('Øvre grense ved intervall (2–3 → 3), ellers null'),
  unit: z.string().nullable().describe('g, kg, dl, l, ml, ss, ts, krm, stk, fedd, boks, pk, klype – eller enheten som står, eller null'),
  note: z.string().nullable().describe('Tillegg som «finhakket» eller «romtemperert»'),
  group: z.string().nullable().describe('Undergruppe, f.eks. «Til sausen», ellers null'),
})

const Step = z.object({
  text: z.string().describe('Hele instruksjonen, avskrevet'),
  action: z.string().describe('Ett kort handlingsord i imperativ: Stek, Bland, Pisk, Kok, Elt, Hev …'),
  ingredientIndexes: z.array(z.number().int()).describe('0-baserte indekser til ingrediensene som tas i bruk FØRST i dette steget'),
  buildsOnSteps: z.array(z.number().int()).describe('Indekser til TIDLIGERE steg hvis resultat brukes her'),
  produces: z.string().nullable().describe('Navn på mellomproduktet steget lager (f.eks. «Saus»), ellers null'),
  durationMin: z.number().int().nullable(),
  durationMaxMin: z.number().int().nullable(),
  temperatureC: z.number().int().nullable(),
})

const RecipeRead = z.object({
  isRecipe: z.boolean(),
  title: z.string(),
  description: z.string().nullable(),
  servings: z.number().int().nullable(),
  servingsUnit: z.string().nullable().describe('«porsjoner», «vafler», «stk» …'),
  totalMinutes: z.number().int().nullable(),
  prepMinutes: z.number().int().nullable(),
  categories: z.array(z.string()).describe('0–3 korte kategorier på norsk, f.eks. «Bakst», «Middag»'),
  ingredients: z.array(Ingredient),
  steps: z.array(Step),
  uncertain: z.array(z.string()).describe('Ord eller deler som var vanskelige å lese, med kort forklaring'),
})

type RecipeReadT = z.infer<typeof RecipeRead>

const SuggestedSteps = z.object({
  steps: z.array(Step),
})
type SuggestedStepsT = z.infer<typeof SuggestedSteps>

const SYSTEM = `Du leser av oppskrifter fra bilder for en norsk familiekokebok. Bildene kan være skjermbilder, sider fra kokebøker eller håndskrevne oppskriftskort – ofte gamle, med utydelig skrift, forkortelser og gammel rettskrivning.

Regler:
1. Skriv av det som faktisk står. Finn aldri på mengder, tider, temperaturer, porsjoner eller steg. Det som ikke står, blir null.
2. Behold originalspråket (vanligvis norsk). Rett åpenbare skrivefeil, men ikke skriv om innholdet.
3. Mengder som tall: «½» → 0.5, «1 1/2» → 1.5, «2–3» → amount 2 og amountMax 3. Kjente enheter skrives som g, kg, dl, l, ml, ss, ts, krm, stk, fedd, boks, pk eller klype. Gamle eller uvanlige enheter (kopp, glass, pund, «en neve») beholdes slik de står og nevnes i «uncertain».
4. Koblinger til rutenettet: «ingredientIndexes» er ingrediensene som tas i bruk første gang i steget. «buildsOnSteps» er tidligere steg som steget bygger videre på. En parallell delprosess (f.eks. «kok pastaen» mens sausen lages) bygger ikke på forrige steg.
5. Er fremgangsmåten ett langt avsnitt, del den i naturlige steg uten å endre innholdet.
6. «uncertain»: alt du ikke kunne lese sikkert, med kort forklaring. Tom liste hvis alt er tydelig.
7. Er bildet ikke en oppskrift: isRecipe = false, tom tittel og tomme lister.
8. Flere bilder hører til samme oppskrift (f.eks. forside og bakside av et kort).`

const SYSTEM_TEXT = `Du henter ut en oppskrift fra teksten på en nettside eller et innlegg i sosiale medier (f.eks. en TikTok- eller Instagram-beskrivelse) for en norsk familiekokebok. Teksten kan inneholde menyer, reklame, kommentarer og emneknagger – ignorer alt som ikke er selve oppskriften.

Regler:
1. Ta bare med det som står. Finn aldri på mengder, tider, temperaturer, porsjoner eller steg. Står fremgangsmåten ikke i teksten, gi en tom liste med steg.
2. Behold språket i teksten. Er oppskriften på et annet språk enn norsk, oversett den til norsk.
3. Mengder som tall: «½» → 0.5, «1 1/2» → 1.5, «2–3» → amount 2 og amountMax 3. Kjente enheter: g, kg, dl, l, ml, ss, ts, krm, stk, fedd, boks, pk, klype. Amerikanske mål (cups, oz, °F) beholdes slik de står og nevnes i «uncertain».
4. «ingredientIndexes» er ingrediensene som tas i bruk første gang i steget; «buildsOnSteps» er tidligere steg steget bygger på. Parallelle delprosesser bygger ikke på forrige steg.
5. «uncertain»: det som var uklart. Er det ingen oppskrift i teksten: isRecipe = false.`

const SYSTEM_SUGGEST = `Du foreslår en fremgangsmåte for en oppskrift i en norsk familiekokebok. Originalen (ofte en TikTok-video) hadde bare tittel og ingrediensliste – stegene ble bare vist i videoen.

Regler:
1. Lag en vanlig, fornuftig fremgangsmåte for retten med de oppgitte ingrediensene, i riktig rekkefølge. Bruk bare ingrediensene i listen, og bruk alle der det er naturlig.
2. Finn aldri på tider, temperaturer eller mengder. Feltene durationMin, durationMaxMin og temperatureC skal være null. Beskriv i stedet hvordan man ser at noe er ferdig («til løken er blank», «til de er gylne»). Trengs ovn, skriv «forvarm ovnen» uten temperatur.
3. Korte, tydelige steg på norsk, i imperativ. «action» er ett handlingsord (Stek, Bland, Kok …).
4. «ingredientIndexes» er 0-baserte indekser i ingredienslisten for ingrediensene som tas i bruk første gang i steget; «buildsOnSteps» er tidligere steg steget bygger på. Parallelle delprosesser (f.eks. koke pasta mens sausen lages) bygger ikke på forrige steg.`

// ---------------- Modellkall ----------------

interface ImageIn {
  data: string
  mediaType: (typeof MEDIA_TYPES)[number]
}

type Content = Anthropic.Beta.BetaContentBlockParam[]

/** Ett kall til Claude med strukturert svar. Eneste sted modellen brukes. */
async function askClaude<T>(system: string, content: Content, schema: z.ZodType<T>) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new ConfigError()
  const client = new Anthropic({ apiKey })
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Ved et sikkerhetsavslag kjøres forespørselen automatisk på en reservemodell
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
    messages: [{ role: 'user', content }],
  })
  if (response.stop_reason === 'refusal') throw new ReadError('Dette kunne ikke leses.', 422)
  if (response.stop_reason === 'max_tokens') throw new ReadError('Oppskriften var for lang til å leses i én omgang.', 422)
  const parsed = response.parsed_output as T | null
  if (!parsed) throw new ReadError('Fikk ikke et gyldig svar. Prøv igjen.', 502)
  return { parsed, model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
}

function readImages(images: ImageIn[]) {
  return askClaude<RecipeReadT>(SYSTEM, [
    ...images.map((img) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.data } })),
    { type: 'text' as const, text: images.length > 1 ? `Her er ${images.length} bilder av samme oppskrift. Les den av.` : 'Les av oppskriften på bildet.' },
  ], RecipeRead)
}

function readText(text: string, url: string) {
  return askClaude<RecipeReadT>(SYSTEM_TEXT, [{ type: 'text', text: `Kilde: ${url}\n\n<tekst>\n${text}\n</tekst>` }], RecipeRead)
}

function suggestSteps(title: string, ingredients: { name: string; amount?: number | null; unit?: string | null; note?: string | null }[]) {
  const list = ingredients
    .map((i, k) => `${k}. ${[i.amount ?? '', i.unit ?? '', i.name].join(' ').trim()}${i.note ? ` (${i.note})` : ''}`)
    .join('\n')
  return askClaude<SuggestedStepsT>(SYSTEM_SUGGEST, [{ type: 'text', text: `Rett: ${title || 'ukjent'}\n\nIngredienser (indeks. ingrediens):\n${list}` }], SuggestedSteps)
}

class ConfigError extends Error {}

// ---------------- HTTP ----------------

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const cors = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Bare POST.' }, 405)

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Du må være logget inn.' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const { data: userData } = await admin.auth.getUser(token)
  const user = userData?.user
  if (!user) return json({ error: 'Du må være logget inn.' }, 401)

  const { data: memberships } = await admin.from('smaker_family_members').select('family_id').eq('user_id', user.id).limit(1)
  const familyId = memberships?.[0]?.family_id as string | undefined
  if (!familyId) return json({ error: 'Du må være med i en familie for å bruke dette.' }, 403)

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('smaker_ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `Du har brukt automatisk lesing ${DAILY_LIMIT} ganger det siste døgnet. Prøv igjen senere.` }, 429)
  }

  const body = await req.json().catch(() => null)
  const mode: 'images' | 'url' | 'suggest-steps' = body?.mode ?? 'images'

  const log = (row: Record<string, unknown>) =>
    admin.from('smaker_ai_usage').insert({ user_id: user.id, family_id: familyId, model: MODEL, kind: mode, ...row })
  const logResult = (r: { model: string; inputTokens: number; outputTokens: number }, images = 0) =>
    log({ model: r.model, input_tokens: r.inputTokens, output_tokens: r.outputTokens, images })

  try {
    if (mode === 'url') {
      const { html, url } = await fetchPage(String(body?.url ?? ''))
      const structured = structuredRecipe(html)
      if (structured) return json({ source: 'structured', recipe: structured, url })
      const result = await readText(pageText(html), url)
      await logResult(result)
      return json({ source: 'ai', recipe: result.parsed, url, model: result.model })
    }

    if (mode === 'suggest-steps') {
      const ingredients = Array.isArray(body?.ingredients) ? body.ingredients.slice(0, 60) : []
      if (!ingredients.length) return json({ error: 'Legg inn ingredienser først.' }, 400)
      const result = await suggestSteps(String(body?.title ?? '').slice(0, 160), ingredients)
      await logResult(result)
      return json({ steps: result.parsed.steps, model: result.model })
    }

    const images: ImageIn[] = Array.isArray(body?.images) ? body.images : []
    if (images.length === 0 || images.length > MAX_IMAGES) {
      return json({ error: `Send mellom 1 og ${MAX_IMAGES} bilder.` }, 400)
    }
    for (const img of images) {
      if (typeof img?.data !== 'string' || !MEDIA_TYPES.includes(img.mediaType)) {
        return json({ error: 'Ukjent bildeformat. Bruk JPG, PNG, WebP eller GIF.' }, 400)
      }
      if (img.data.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: 'Bildet er for stort (maks 5 MB).' }, 413)
    }
    const result = await readImages(images)
    await logResult(result, images.length)
    return json({ recipe: result.parsed, model: result.model })
  } catch (e) {
    if (e instanceof ConfigError) return json({ error: 'Bildelesing er ikke satt opp ennå.' }, 503)
    if (e instanceof ReadError) {
      if (e.status >= 500) await log({ ok: false, error: e.message.slice(0, 300) })
      return json({ error: e.message }, e.status)
    }
    await log({ ok: false, error: e instanceof Error ? e.message.slice(0, 300) : 'ukjent' })
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Tjenesten er travel akkurat nå. Prøv igjen om litt.' }, 503)
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'Lesingen er feil satt opp (API-nøkkel).' }, 503)
    if (e instanceof Anthropic.BadRequestError) return json({ error: 'Dette kunne ikke leses. Prøv et annet bilde eller en annen lenke.' }, 400)
    if (e instanceof Anthropic.APIError) return json({ error: 'Lesingen feilet. Prøv igjen.' }, 502)
    return json({ error: 'Noe gikk galt.' }, 500)
  }
})
