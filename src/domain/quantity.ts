/**
 * Mengder: tolking ("1 1/2 dl melk"), formatering ("1½ dl") og omregning
 * ved endret antall porsjoner.
 */

/** Kjente enheter → normalisert form. Nøklene er små bokstaver uten punktum. */
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', gram: 'g',
  kg: 'kg', kilo: 'kg',
  mg: 'mg',
  ml: 'ml', cl: 'cl', dl: 'dl', l: 'l', liter: 'l',
  ss: 'ss', spiseskje: 'ss', spiseskjeer: 'ss', ts: 'ts', teskje: 'ts', teskjeer: 'ts',
  krm: 'krm', klype: 'klype', klyper: 'klype',
  stk: 'stk', stykk: 'stk', stykker: 'stk',
  fedd: 'fedd', pk: 'pk', pakke: 'pk', pakker: 'pk', pose: 'pose', poser: 'pose',
  boks: 'boks', bokser: 'boks', glass: 'glass', beger: 'beger', kopp: 'kopp', kopper: 'kopp',
  never: 'neve', neve: 'neve', skive: 'skive', skiver: 'skive', bunt: 'bunt', bunter: 'bunt',
  plate: 'plate', plater: 'plate', terning: 'terning', terninger: 'terning',
  tbsp: 'ss', tsp: 'ts', cup: 'kopp', cups: 'kopp', oz: 'oz', lb: 'lb',
}

export const COMMON_UNITS = ['g', 'kg', 'dl', 'l', 'ml', 'ss', 'ts', 'krm', 'stk', 'fedd', 'boks', 'pk', 'klype']

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

export function normalizeUnit(raw: string): string | null {
  const key = raw.toLowerCase().replace(/\.$/, '')
  return UNIT_ALIASES[key] ?? null
}

/** "1", "1,5", "1.5", "1/2", "1 1/2", "1½", "½" → tall. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  // 1½
  const uni = s.match(/^(\d+)?\s*([½⅓⅔¼¾⅕⅛⅜⅝⅞])$/)
  if (uni) return (uni[1] ? parseInt(uni[1], 10) : 0) + UNICODE_FRACTIONS[uni[2]]
  // 1 1/2
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10)
  // 1/2
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10)
  // 1,5 / 1.5 / 2
  const dec = s.match(/^\d+(?:[.,]\d+)?$/)
  if (dec) return parseFloat(s.replace(',', '.'))
  return null
}

const NUM = String.raw`(?:\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d*\s*[½⅓⅔¼¾⅕⅛⅜⅝⅞]|\d+(?:[.,]\d+)?)`
const AMOUNT_RE = new RegExp(String.raw`^(${NUM})(?:\s*(?:-|–|til)\s*(${NUM}))?\s*`, 'i')

export interface ParsedIngredientLine {
  amount: number | null
  amountMax: number | null
  unit: string | null
  name: string
  note?: string
}

/**
 * Tolker én ingredienslinje.
 *   "400 g kyllingfilet, i terninger" → 400, g, "kyllingfilet", note "i terninger"
 *   "2–3 fedd hvitløk"                → 2, 3, fedd, "hvitløk"
 *   "Salt og pepper"                  → null (ingen mengde – vi gjetter ikke)
 */
export function parseIngredientLine(line: string): ParsedIngredientLine {
  let rest = line
    .trim()
    .replace(/^[-•*·–]\s*/, '') // punktlistetegn
    .replace(/^ca\.?\s+/i, '')

  let amount: number | null = null
  let amountMax: number | null = null
  let unit: string | null = null

  const m = rest.match(AMOUNT_RE)
  if (m) {
    amount = parseNumber(m[1])
    amountMax = m[2] ? parseNumber(m[2]) : null
    rest = rest.slice(m[0].length)
    const u = rest.match(/^([a-zA-ZæøåÆØÅ]+)\.?(?=\s|$)/)
    if (u) {
      const norm = normalizeUnit(u[1])
      if (norm) {
        unit = norm
        rest = rest.slice(u[0].length).trim()
      }
    }
  }

  // Merknad etter komma eller i parentes
  let note: string | undefined
  const paren = rest.match(/\(([^)]+)\)\s*$/)
  if (paren) {
    note = paren[1].trim()
    rest = rest.slice(0, paren.index).trim()
  }
  const comma = rest.indexOf(',')
  if (comma > 0) {
    const after = rest.slice(comma + 1).trim()
    note = note ? `${after}, ${note}` : after
    rest = rest.slice(0, comma).trim()
  }

  return { amount, amountMax, unit, name: rest.trim(), note: note || undefined }
}

/** Ser linjen ut som en ingrediens? Brukes når teksten mangler overskrifter. */
export function looksLikeIngredient(line: string): boolean {
  const t = line.trim().replace(/^[-•*·–]\s*/, '')
  if (!t || t.length > 70) return false
  if (/[.!?]$/.test(t) && t.split(/\s+/).length > 6) return false
  if (AMOUNT_RE.test(t)) {
    // "1. Stek løken" er et nummerert steg, ikke en ingrediens
    if (/^\d+\s*[.)]\s+\p{L}/u.test(t)) return false
    return true
  }
  return /^(salt|pepper|olje|smør|vann)\b/i.test(t) || /\better smak\b/i.test(t)
}

// ---------- Formatering ----------

const NICE_FRACTIONS: [number, string][] = [
  [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'],
]

/** Enheter der brøker er naturlige (1½ dl, ¾ ts). Gram vises som heltall. */
const FRACTION_UNITS = new Set([null, 'dl', 'l', 'ss', 'ts', 'krm', 'stk', 'kopp', 'boks', 'pk', 'fedd', 'neve', 'glass', 'beger', 'pose'])

export function formatNumber(n: number, unit: string | null = null): string {
  if (unit === 'g' || unit === 'ml') {
    // 437 g → 440 g – ingen later som om de veier på grammet
    const r = n >= 100 ? Math.round(n / 5) * 5 : Math.round(n)
    return String(r)
  }
  if (FRACTION_UNITS.has(unit)) {
    const whole = Math.floor(n)
    const frac = n - whole
    if (frac < 0.06) return whole > 0 ? String(whole) : formatDecimal(n)
    if (frac > 0.94) return String(whole + 1)
    for (const [v, sym] of NICE_FRACTIONS) {
      if (Math.abs(frac - v) < 0.04) return whole ? `${whole}${sym}` : sym
    }
  }
  return formatDecimal(n)
}

function formatDecimal(n: number): string {
  const rounded = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10
  return String(rounded).replace('.', ',')
}

export function formatAmount(
  amount: number | null,
  amountMax: number | null | undefined,
  unit: string | null,
  factor = 1,
): string {
  if (amount === null) return ''
  const a = formatNumber(amount * factor, unit)
  const b = amountMax != null ? formatNumber(amountMax * factor, unit) : null
  const num = b && b !== a ? `${a}–${b}` : a
  return unit ? `${num} ${unit}` : num
}

export function formatMinutes(min: number | null | undefined, max?: number | null): string {
  if (min == null) return ''
  const one = (m: number) => {
    if (m < 60) return `${m} min`
    const h = Math.floor(m / 60)
    const r = m % 60
    return r ? `${h} t ${r} min` : `${h} t`
  }
  if (max != null && max !== min) {
    if (max < 60) return `${min}–${max} min`
    return `${one(min)}–${one(max)}`
  }
  return one(min)
}

/** Ingredienser uten mengde som det er helt normalt å la være uten tall. */
export function isToTaste(name: string): boolean {
  return /\b(salt|pepper|etter smak|til steking|til servering|til pensling|olje|smør til)\b/i.test(name)
}
