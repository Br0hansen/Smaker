/**
 * Henting og tolking av nettsider for smaker-read-recipe.
 * Ren logikk uten Supabase/Claude, så den kan testes med `deno test`.
 */

export class ReadError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}


const MAX_HTML_BYTES = 3 * 1024 * 1024
const MAX_TEXT_CHARS = 20000

/** Blokkerer interne adresser, så funksjonen ikke kan brukes til å nå private nett. */
export function blockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home.arpa')) return true
  if (h.includes(':')) return true // IPv6-adresser direkte: ikke nødvendig for oppskriftssider
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  return !h.includes('.')
}

export async function fetchPage(input: string): Promise<{ html: string; url: string }> {
  let current: URL
  try {
    current = new URL(input.trim())
  } catch {
    throw new ReadError('Det ser ikke ut som en gyldig lenke.', 400)
  }
  for (let hop = 0; hop < 5; hop++) {
    if (!['http:', 'https:'].includes(current.protocol) || (current.port && !['80', '443'].includes(current.port)) || blockedHost(current.hostname)) {
      throw new ReadError('Den lenken kan ikke hentes.', 400)
    }
    let res: Response
    try {
      res = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(12000),
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; SmakerOppskrift/1.0; +https://br0hansen.github.io/Smaker/)',
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.6',
        },
      })
    } catch {
      throw new ReadError('Fikk ikke kontakt med siden. Sjekk lenken og prøv igjen.', 502)
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) break
      current = new URL(loc, current)
      continue
    }
    if (!res.ok) throw new ReadError(`Siden svarte med feil (${res.status}). Noen sider stenger ute apper – prøv å kopiere teksten i stedet.`, 502)
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('html')) throw new ReadError('Lenken peker ikke til en nettside.', 400)
    const reader = res.body?.getReader()
    if (!reader) throw new ReadError('Siden var tom.', 502)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_HTML_BYTES) {
        await reader.cancel()
        break
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size > MAX_HTML_BYTES ? chunks.reduce((n, c) => n + c.byteLength, 0) : size)
    let off = 0
    for (const c of chunks) {
      bytes.set(c, off)
      off += c.byteLength
    }
    return { html: new TextDecoder('utf-8').decode(bytes), url: current.toString() }
  }
  throw new ReadError('Lenken videresender for mange ganger.', 400)
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°',
  aring: 'å', Aring: 'Å', oslash: 'ø', Oslash: 'Ø', aelig: 'æ', AElig: 'Æ', eacute: 'é', ndash: '–', mdash: '—', hellip: '…',
}
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+\d*);/gi, (m, n) => ENTITIES[n] ?? m)
}
const stripTags = (s: string) => decodeEntities(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').trim()

/** schema.org/Recipe, gjort om til en enkel form klienten kan tolke videre. */
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

const typeIs = (o: Record<string, unknown> | null | undefined, t: string) => {
  const ty = o?.['@type']
  return ty === t || (Array.isArray(ty) && ty.includes(t))
}

function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
  if (!node || depth > 6) return null
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n, depth + 1)
      if (r) return r
    }
    return null
  }
  if (typeof node !== 'object') return null
  const o = node as Record<string, unknown>
  if (typeIs(o, 'Recipe')) return o
  return findRecipe(o['@graph'], depth + 1) ?? findRecipe(o['mainEntity'], depth + 1)
}

function instructionList(v: unknown): string[] {
  if (!v) return []
  if (typeof v === 'string') return stripTags(v).split(/\n+|(?<=\.)\s+(?=\d+\.\s)/).map((x) => x.trim()).filter(Boolean)
  if (Array.isArray(v)) return v.flatMap(instructionList)
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeIs(o, 'HowToSection')) return instructionList(o.itemListElement)
    const text = (o.text ?? o.name ?? o.description) as string | undefined
    return text ? [stripTags(String(text))] : []
  }
  return []
}

export function isoMinutes(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const m = v.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/i)
  if (!m || (!m[1] && !m[2] && !m[3])) return null
  const min = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return min > 0 ? min : null
}

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap(asStrings) : typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []

function imageUrl(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return imageUrl(v[0])
  if (typeof v === 'object') return imageUrl((v as Record<string, unknown>).url)
  return null
}

export function structuredRecipe(html: string): WebRecipe | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const [, raw] of scripts) {
    let data: unknown
    try {
      data = JSON.parse(raw.trim())
    } catch {
      try {
        data = JSON.parse(decodeEntities(raw.trim()).replace(/[\u0000-\u001f]+/g, ' '))
      } catch {
        continue
      }
    }
    const r = findRecipe(data)
    if (!r) continue
    const ingredients = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : Array.isArray(r.ingredients) ? r.ingredients : [])
      .map((x: unknown) => stripTags(String(x)))
      .filter(Boolean)
    if (!ingredients.length) continue
    const total = isoMinutes(r.totalTime)
    const prep = isoMinutes(r.prepTime)
    const cook = isoMinutes(r.cookTime)
    const y = Array.isArray(r.recipeYield) ? r.recipeYield.find((x) => /\d/.test(String(x))) ?? r.recipeYield[0] : r.recipeYield
    return {
      name: stripTags(String(r.name ?? '')),
      description: r.description ? stripTags(String(r.description)).slice(0, 400) : null,
      ingredients,
      instructions: instructionList(r.recipeInstructions),
      yield: y != null ? stripTags(String(y)) : null,
      totalMinutes: total ?? (prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null),
      prepMinutes: prep,
      categories: [...new Set([...asStrings(r.recipeCategory), ...asStrings(r.recipeCuisine)])].slice(0, 3),
      image: imageUrl(r.image),
    }
  }
  return null
}

function meta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i')
  const m = html.match(re)
  return m ? decodeEntities(m[1] ?? m[2] ?? '').trim() || null : null
}

/** Leselig tekst fra en side uten strukturerte data (til Claude). */
export function pageText(html: string): string {
  const title = meta(html, 'og:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const desc = meta(html, 'og:description') ?? meta(html, 'description') ?? ''
  const body = html
    .replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
  const text = stripTags(body).replace(/\n\s*\n+/g, '\n').trim()
  return [`Tittel: ${stripTags(title)}`, desc ? `Beskrivelse: ${desc}` : '', text].filter(Boolean).join('\n\n').slice(0, MAX_TEXT_CHARS)
}


// ---------------- Språk ----------------

/** Samme heuristikk som src/domain/language.ts (holdes like). */
const NO = /\b(og|med|til|ikke|eller|på|av|som|den|det|en|ei|et|skal|ha|stek|steik|rør|bland|pisk|kok|hakk|ovnen|deigen|minutter|grader|ss|ts|dl|krm|stk|smør|mel|melk|sukker|egg|løk|salt|pepper|fløte|gjær|kanel)\b/gi
const EN = /\b(and|with|the|of|to|until|into|cup|cups|tablespoons?|teaspoons?|tbsp|tsp|oz|ounces?|pounds?|lbs?|minutes|degrees|preheat|bake|stir|whisk|mix|add|flour|sugar|butter|milk|eggs|onion|garlic|cream|oven|heat|serve)\b/gi
export function looksNorwegian(text: string): boolean {
  const sample = text.slice(0, 4000)
  const no = (sample.match(NO) ?? []).length
  const en = (sample.match(EN) ?? []).length
  return no >= en * 0.8 || en < 4
}

/** Sidens språkmerke, f.eks. «en» fra <html lang="en-US">. */
export function pageLanguage(html: string): string | null {
  const m = html.match(/<html[^>]*\blang=["']?([a-zA-Z]{2,3})/i)
  return m ? m[1].toLowerCase() : null
}

/** Er en strukturert oppskrift norsk? Språkmerket avgjør hvis det finnes, ellers ordtesten. */
export function isNorwegianRecipe(r: WebRecipe, html: string): boolean {
  const lang = pageLanguage(html)
  if (lang && ['nb', 'no', 'nn', 'nob', 'nno', 'nor'].includes(lang)) return true
  const text = [r.name, ...r.ingredients, ...r.instructions].join('\n')
  if (lang && lang !== 'en') return false
  return looksNorwegian(text)
}

/** Strukturert oppskrift som ren tekst, så Claude kan oversette den. */
export function recipeAsText(r: WebRecipe): string {
  return [
    `Title: ${r.name}`,
    r.description ? `Description: ${r.description}` : '',
    r.yield ? `Yield: ${r.yield}` : '',
    r.totalMinutes != null ? `Total time: ${r.totalMinutes} minutes` : '',
    r.prepMinutes != null ? `Prep time: ${r.prepMinutes} minutes` : '',
    '',
    'Ingredients:',
    ...r.ingredients.map((i) => `- ${i}`),
    '',
    'Instructions:',
    ...r.instructions.map((s, i) => `${i + 1}. ${s}`),
  ].join('\n')
}
