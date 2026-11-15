/**
 * smaker-read-recipe – leser en oppskrift fra ett eller flere bilder
 * (skjermbilder, kokebokssider, håndskrevne kort) og returnerer den som
 * strukturert JSON i samme form som appens oppskriftsutkast.
 *
 * Sikkerhet og kostnad:
 *  - Krever innlogget bruker (JWT sjekkes av Supabase) som er med i en familie.
 *  - Døgngrense per bruker (DAILY_LIMIT), logget i smaker_ai_usage.
 *  - API-nøkkelen ligger som hemmelighet (ANTHROPIC_API_KEY) – aldri i appen.
 *
 * Modellkallet ligger i én funksjon (readWithClaude), så en annen leverandør
 * kan legges til ved siden av for sammenligning uten å røre resten.
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

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

// ---------------- Modellkallet ----------------

interface ImageIn {
  data: string
  mediaType: (typeof MEDIA_TYPES)[number]
}

async function readWithClaude(images: ImageIn[]) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new ConfigError()
  const client = new Anthropic({ apiKey })
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Ved et sikkerhetsavslag kjøres forespørselen automatisk på en reservemodell
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'medium', format: betaZodOutputFormat(RecipeRead) },
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((img) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
          })),
          {
            type: 'text' as const,
            text: images.length > 1 ? `Her er ${images.length} bilder av samme oppskrift. Les den av.` : 'Les av oppskriften på bildet.',
          },
        ],
      },
    ],
  })
  if (response.stop_reason === 'refusal') throw new ReadError('Bildet kunne ikke leses.', 422)
  if (response.stop_reason === 'max_tokens') throw new ReadError('Oppskriften var for lang til å leses i én omgang.', 422)
  const read = response.parsed_output as RecipeReadT | null
  if (!read) throw new ReadError('Fikk ikke et gyldig svar. Prøv igjen.', 502)
  return {
    read,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

class ConfigError extends Error {}
class ReadError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

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
  if (!familyId) return json({ error: 'Du må være med i en familie for å lese inn bilder.' }, 403)

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('smaker_ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `Du har lest inn ${DAILY_LIMIT} bilder det siste døgnet. Prøv igjen senere.` }, 429)
  }

  const body = await req.json().catch(() => null)
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

  const log = (row: Record<string, unknown>) =>
    admin.from('smaker_ai_usage').insert({ user_id: user.id, family_id: familyId, model: MODEL, images: images.length, ...row })

  try {
    const result = await readWithClaude(images)
    await log({ model: result.model, input_tokens: result.inputTokens, output_tokens: result.outputTokens })
    return json({ recipe: result.read, model: result.model })
  } catch (e) {
    if (e instanceof ConfigError) return json({ error: 'Bildelesing er ikke satt opp ennå.' }, 503)
    await log({ ok: false, error: e instanceof Error ? e.message.slice(0, 300) : 'ukjent' })
    if (e instanceof ReadError) return json({ error: e.message }, e.status)
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Tjenesten er travel akkurat nå. Prøv igjen om litt.' }, 503)
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'Bildelesing er feil satt opp (API-nøkkel).' }, 503)
    if (e instanceof Anthropic.BadRequestError) return json({ error: 'Bildet kunne ikke leses. Prøv et annet bilde.' }, 400)
    if (e instanceof Anthropic.APIError) return json({ error: 'Bildelesing feilet. Prøv igjen.' }, 502)
    return json({ error: 'Noe gikk galt.' }, 500)
  }
})
