/**
 * Gjør innlimt tekst (fra nettside, melding, dokument eller tekstgjenkjenning
 * av et bilde) om til et oppskriftsutkast.
 *
 * Prinsipp: vi foreslår, brukeren bestemmer. Vi finner ALDRI på mengder eller
 * tider – det som mangler, blir stående tomt og markeres i forhåndsvisningen.
 */
import { newId } from './ids'
import { autoLink, type DraftStep } from './linker'
import { looksLikeIngredient, parseIngredientLine } from './quantity'
import type { Ingredient, Recipe } from './types'

export type RecipeDraft = Pick<
  Recipe,
  'title' | 'description' | 'servings' | 'servingsUnit' | 'prepMinutes' | 'totalMinutes' | 'categories' | 'ingredients' | 'steps'
>

const ING_HEADER = /^(ingredienser|ingrediens|du trenger|dette trenger du|det trenger du|handleliste|ingredients)\s*:?\s*$/i
const STEP_HEADER = /^(fremgangsmåte|framgangsmåte|slik gjør du|gjør slik|slik lager du|instruksjoner|tilberedning|oppskrift|method|instructions|directions)\s*:?\s*$/i
const SUBGROUP = /^(til|for)\s+[\p{L} ]{2,30}:$|^[\p{L} ]{2,25}:$/iu
const NUMBERED = /^(?:steg\s*)?(\d{1,2})\s*[.):]\s+/i

const CATEGORY_HINTS: [RegExp, string][] = [
  [/\b(kake|bolle|vaffel|vafler|muffins|brød|deig|bake|bakst|kjeks|terte|pai)\b/i, 'Bakst'],
  [/\b(dessert|is|pudding|krem|mousse)\b/i, 'Dessert'],
  [/\b(suppe)\b/i, 'Suppe'],
  [/\b(pasta|spaghetti|lasagne|tagliatelle|penne)\b/i, 'Pasta'],
  [/\b(kylling|kalkun)\b/i, 'Kylling'],
  [/\b(fisk|laks|torsk|sei|reker|scampi)\b/i, 'Fisk og sjømat'],
  [/\b(kjøttkaker|kjøttboller|biff|svin|lam|karbonade|kjøttdeig)\b/i, 'Kjøtt'],
  [/\b(salat)\b/i, 'Salat'],
  [/\b(vegetar|vegansk|linser|kikerter|bønner|tofu)\b/i, 'Vegetar'],
  [/\b(pizza)\b/i, 'Pizza'],
]

export function parseRecipeText(input: string): RecipeDraft {
  const lines = input
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)

  let title = ''
  let servings: number | null = null
  let servingsUnit: string | undefined
  let totalMinutes: number | null = null
  let prepMinutes: number | null = null
  const descLines: string[] = []
  const ingLines: { text: string; group?: string }[] = []
  const stepLines: string[] = []

  type Mode = 'head' | 'ing' | 'steps'
  let mode: Mode = 'head'
  let group: string | undefined
  const hasHeaders = lines.some((l) => ING_HEADER.test(l) || STEP_HEADER.test(l))

  for (const line of lines) {
    // Metadata kan stå hvor som helst
    const meta = readMeta(line)
    if (meta) {
      if (meta.servings != null && servings == null) {
        servings = meta.servings
        servingsUnit = meta.servingsUnit
      }
      if (meta.totalMinutes != null && totalMinutes == null) totalMinutes = meta.totalMinutes
      if (meta.prepMinutes != null && prepMinutes == null) prepMinutes = meta.prepMinutes
      if (meta.consumed) continue
    }

    if (ING_HEADER.test(line)) { mode = 'ing'; group = undefined; continue }
    if (STEP_HEADER.test(line)) { mode = 'steps'; continue }

    if (!title) {
      if (!looksLikeIngredient(line) && !NUMBERED.test(line) && line.length <= 90) {
        title = line.replace(/[.:]$/, '')
        continue
      }
    }

    if (mode === 'ing') {
      if (SUBGROUP.test(line) && !looksLikeIngredient(line)) {
        group = line.replace(/:$/, '')
        continue
      }
      // En lang setning midt i ingredienslisten er sannsynligvis starten på fremgangsmåten.
      if (!looksLikeIngredient(line) && (line.split(' ').length > 8 || NUMBERED.test(line))) {
        mode = 'steps'
        stepLines.push(line)
        continue
      }
      ingLines.push({ text: line, group })
      continue
    }
    if (mode === 'steps') {
      stepLines.push(line)
      continue
    }

    // mode === 'head': før noen overskrift
    if (!hasHeaders) {
      if (stepLines.length === 0 && looksLikeIngredient(line)) { ingLines.push({ text: line }); continue }
      // Etter ingrediensene er alt annet steg.
      if (ingLines.length > 0 || NUMBERED.test(line)) { stepLines.push(line); continue }
    }
    descLines.push(line)
  }

  // Uten overskrifter havner beskrivelsen ofte etter ingrediensene – flytt til steg hvis det er naturlig.
  if (!hasHeaders && stepLines.length === 0 && descLines.length > 0 && ingLines.length > 0) {
    stepLines.push(...descLines.splice(0))
  }

  const ingredients: Ingredient[] = ingLines.map(({ text, group }) => {
    const p = parseIngredientLine(text)
    return {
      id: newId(),
      name: p.name || text,
      amount: p.amount,
      amountMax: p.amountMax,
      unit: p.unit,
      note: p.note,
      group,
    }
  })

  const drafts: DraftStep[] = splitSteps(stepLines).map((text) => ({ id: newId(), text }))
  const steps = autoLink(ingredients, drafts)

  const all = [title, ...descLines, ...ingLines.map((l) => l.text)].join(' ')
  const categories = [...new Set(CATEGORY_HINTS.filter(([re]) => re.test(all)).map(([, c]) => c))].slice(0, 3)

  if (!title && descLines.length) title = descLines.shift()!

  return {
    title,
    description: descLines.join(' ') || undefined,
    servings,
    servingsUnit,
    prepMinutes,
    totalMinutes,
    categories,
    ingredients,
    steps,
  }
}

function splitSteps(lines: string[]): string[] {
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.replace(NUMBERED, '').replace(/^[-•*·]\s*/, '').trim()
    if (!line) continue
    // Ett langt avsnitt uten nummerering → del på setninger, men hold korte setninger sammen.
    if (lines.length <= 2 && line.length > 160) {
      const sentences = line.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [line]
      let buf = ''
      for (const s of sentences.map((x) => x.trim())) {
        buf = buf ? `${buf} ${s}` : s
        if (buf.length > 50) { out.push(buf); buf = '' }
      }
      if (buf) out.push(buf)
      continue
    }
    out.push(line)
  }
  return out
}

interface Meta {
  servings?: number
  servingsUnit?: string
  totalMinutes?: number
  prepMinutes?: number
  /** true når hele linjen bare var metadata. */
  consumed: boolean
}

function readMeta(line: string): Meta | null {
  const meta: Meta = { consumed: false }
  let hit = false

  // "Porsjoner: 4", "Gir 20 vafler", "Til 4 personer", "4 porsjoner"
  const sv =
    line.match(/^(?:porsjoner|antall porsjoner|gir|til|for)\s*:?\s*(\d+)\s*([\p{L}]+)?/iu) ??
    line.match(/(\d+)\s*(porsjoner|porsjon|personer|pers\.?)(?=\s|$|[,.)])/iu)
  if (sv) {
    meta.servings = parseInt(sv[1], 10)
    const unit = sv[2]?.toLowerCase().replace(/\.$/, '')
    meta.servingsUnit = unit && !/^(porsjon|porsjoner|personer|pers|stk)$/.test(unit) ? unit : 'porsjoner'
    hit = true
  }

  const time = line.match(/(?:tid|tar|tidsbruk|total tid|tilberedningstid|steketid)\s*:?\s*(?:ca\.?\s*)?(\d+)\s*(min|minutter|t|time|timer)\b/i)
  if (time) {
    const m = parseInt(time[1], 10) * (/^t/i.test(time[2]) ? 60 : 1)
    if (/forberedelse|aktiv/i.test(line)) meta.prepMinutes = m
    else meta.totalMinutes = m
    hit = true
  }

  if (!hit) return null
  meta.consumed = line.length < 45
  return meta
}
