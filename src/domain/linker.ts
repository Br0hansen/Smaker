/**
 * Automatisk kobling mellom ingredienser og steg, slik at Recipe Grid kan
 * lages fra en vanlig tekstoppskrift.
 *
 * Det er et FORSLAG. Brukeren ser og kan rette alle koblinger før lagring.
 *
 * Tommelfingerregler:
 *  1. En ingrediens kobles til første steg som nevner den.
 *  2. Et steg bygger videre på "hovedsporet" (forrige vanlige steg).
 *  3. Rene forberedelser ("Finhakk løken", "Riv osten") og steg med ord som
 *     "samtidig", "imens", "separat" starter en egen gren (parallell prosess).
 *  4. En gren slås sammen med hovedsporet i første steg som nevner noe fra den.
 *  5. "Forvarm ovnen" og lignende er rene forberedelsessteg uten input.
 */
import type { Id, Ingredient, Step, StepInput } from './types'

const PREP_VERBS = [
  'kutt', 'skjær', 'hakk', 'finhakk', 'grovhakk', 'riv', 'skrell', 'del', 'strimle', 'skyll',
  'vask', 'mål', 'veie', 'press', 'knus', 'rens', 'tin',
]
const PARALLEL_HINTS = /\b(samtidig|imens|i mellomtiden|separat|i en annen|i en egen|i en ny|i en liten)\b/i
const OVEN_ONLY = /^(forvarm|sett på ovnen|skru på ovnen|slå på ovnen|varm opp ovnen|kle en|smør en|smør formen|finn fram)/i

/** Kjente handlinger, i den formen de vises i rutenettet. */
const ACTIONS: [RegExp, string][] = [
  [/\bforvarm/i, 'Forvarm'],
  [/\bfinhakk/i, 'Finhakk'],
  [/\bgrovhakk/i, 'Grovhakk'],
  [/\bhakk/i, 'Hakk'],
  [/\b(kutt|skjær)/i, 'Kutt'],
  [/\briv\b/i, 'Riv'],
  [/\bskrell/i, 'Skrell'],
  [/\bstrimle/i, 'Strimle'],
  [/\bsmelt/i, 'Smelt'],
  [/\bbrun/i, 'Brun'],
  [/\bfres/i, 'Fres'],
  [/\b(stek|steik)/i, 'Stek'],
  [/\bgrill/i, 'Grill'],
  [/\bbak\b|\bbakes\b|\bstekes i ovnen/i, 'Bak'],
  [/\b(kok|koke|kokes)\b/i, 'Kok'],
  [/\bsmå?kok/i, 'Småkok'],
  [/\bvisp\b|\bpisk/i, 'Pisk'],
  [/\belt\b|\bkna\b/i, 'Elt'],
  [/\b(hev|heve|heves)\b/i, 'Hev'],
  [/\bhvile|\bla .* hvile/i, 'Hvil'],
  [/\bvend\b/i, 'Vend inn'],
  [/\brør\b/i, 'Rør'],
  [/\bbland/i, 'Bland'],
  [/\bmos\b/i, 'Mos'],
  [/\bkjevle|\bkjevl/i, 'Kjevle'],
  [/\bform\b|\bformes\b/i, 'Form'],
  [/\bfordel|\bfyll\b/i, 'Fordel'],
  [/\bdryss|\bstrø\b/i, 'Dryss'],
  [/\bsmør\b/i, 'Smør'],
  [/\bsil\b|\bhell av/i, 'Sil'],
  [/\bkrydre|\bsmak til/i, 'Smak til'],
  [/\bhell\b|\btilsett|\bha i\b|\bha (?:\S+ )?(?:i|oppi)\b/i, 'Tilsett'],
  [/\bavkjøl|\bkjøl\b|\bla .* avkjøle/i, 'Avkjøl'],
  [/\bserver/i, 'Server'],
]

export function guessAction(text: string): string {
  // Den første handlingen som står tidligst i setningen vinner.
  let best: { pos: number; label: string } | null = null
  for (const [re, label] of ACTIONS) {
    const m = re.exec(text)
    if (m && (best === null || m.index < best.pos)) best = { pos: m.index, label }
  }
  if (best) return best.label
  const first = text.trim().split(/\s+/)[0] ?? ''
  return first ? first[0].toUpperCase() + first.slice(1).replace(/[.,:;]$/, '') : 'Steg'
}

// ---------- Tekstmatching ----------

const STOP_WORDS = new Set([
  'og', 'eller', 'med', 'til', 'av', 'i', 'på', 'en', 'et', 'ei', 'fersk', 'ferske', 'store', 'stor',
  'små', 'liten', 'god', 'gode', 'hel', 'hele', 'kald', 'kaldt', 'varm', 'varmt', 'myk', 'mykt',
  'revet', 'hakket', 'hakkede', 'finhakket', 'tørket', 'tørkede', 'frossen', 'frosne',
])

function words(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
}

/** Lager søkeord fra ingrediensnavnet. "kyllingfilet" → ["kyllingfilet", "kylling"]. */
function ingredientKeys(name: string): string[] {
  const keys = new Set<string>()
  for (const w of words(name)) {
    keys.add(w.slice(0, Math.max(4, Math.min(w.length, 6))))
    // Sammensatte ord: "kyllingfilet" → "kylling", "hvetemel" → "hvete" og "mel"
    for (const tail of ['filet', 'kjøtt', 'mel', 'saus', 'ost', 'fløte', 'smør', 'løk', 'pulver', 'sukker']) {
      if (w.endsWith(tail) && w.length > tail.length + 2) {
        keys.add(w.slice(0, w.length - tail.length).slice(0, 6))
      }
    }
  }
  return [...keys]
}

export function mentions(text: string, ingredientName: string): boolean {
  const ws = words(text)
  const keys = ingredientKeys(ingredientName)
  return keys.some((k) => ws.some((w) => w.startsWith(k) || (k.length >= 4 && w.endsWith(k))))
}

/** "alt", "resten", "ingrediensene" – peker mot alt som er igjen. */
const EVERYTHING = /\b(alle ingrediensene|resten av ingrediensene|alt sammen|de tørre ingrediensene|de våte ingrediensene)\b/i

// ---------- Hovedfunksjonen ----------

export interface DraftStep {
  id: Id
  text: string
  action?: string
}

export function autoLink(ingredients: Ingredient[], drafts: DraftStep[]): Step[] {
  const owned = new Set<Id>()
  const ingOfStep = new Map<Id, Id[]>() // ingredienser som flyter inn (transitivt), for grenmatching
  const open: Id[] = [] // steg som ikke er brukt videre ennå
  let main: Id | null = null
  const steps: Step[] = []

  drafts.forEach((d, i) => {
    const text = d.text.trim()
    const action = d.action?.trim() || guessAction(text)
    const inputs: StepInput[] = []

    // Ingredienser som nevnes og ikke er brukt før
    let mentioned = ingredients.filter((ing) => !owned.has(ing.id) && mentions(text, ing.name))
    if (EVERYTHING.test(text)) mentioned = ingredients.filter((ing) => !owned.has(ing.id))
    // Første steg med "bland" e.l. uten treff: ta ingen – brukeren kan koble selv.

    const ovenOnly = OVEN_ONLY.test(text) && mentioned.length === 0
    if (ovenOnly) {
      steps.push({ id: d.id, text, action, inputs: [], ...extractStepMeta(text) })
      return
    }

    const firstWord = text.toLowerCase().split(/\s+/)[0] ?? ''
    const isPrepVerb = PREP_VERBS.some((v) => firstWord.startsWith(v))
    const parallel = PARALLEL_HINTS.test(text)

    // Grener som nevnes i dette steget (via ingrediensene sine eller navnet på mellomproduktet)
    const branchHits = open.filter((sid) => {
      if (sid === main) return false
      const src = steps.find((s) => s.id === sid)!
      if (src.produces && text.toLowerCase().includes(src.produces.toLowerCase())) return true
      return (ingOfStep.get(sid) ?? []).some((ingId) => {
        const ing = ingredients.find((x) => x.id === ingId)!
        return mentions(text, ing.name)
      })
    })

    const startsBranch = (isPrepVerb && mentioned.length > 0 && branchHits.length === 0) || (parallel && i > 0)

    if (!startsBranch && main && open.includes(main)) inputs.push({ kind: 'step', id: main })
    for (const sid of branchHits) inputs.push({ kind: 'step', id: sid })
    for (const ing of mentioned) {
      inputs.push({ kind: 'ingredient', id: ing.id })
      owned.add(ing.id)
    }

    // Bokføring
    const flowing = new Set<Id>(mentioned.map((m) => m.id))
    for (const inp of inputs) {
      if (inp.kind === 'step') {
        ;(ingOfStep.get(inp.id) ?? []).forEach((x) => flowing.add(x))
        const k = open.indexOf(inp.id)
        if (k >= 0) open.splice(k, 1)
      }
    }
    ingOfStep.set(d.id, [...flowing])
    open.push(d.id)
    if (!startsBranch) main = d.id
    else if (main === null && !isPrepVerb) main = d.id

    steps.push({ id: d.id, text, action, inputs, ...extractStepMeta(text) })
  })

  // Grener som aldri ble nevnt igjen, slås sammen i siste vanlige steg.
  const last = steps.length ? steps[steps.length - 1] : null
  if (last && last.id === main) {
    for (const sid of open) {
      if (sid !== last.id && (ingOfStep.get(sid)?.length ?? 0) > 0) {
        last.inputs.splice(0, 0, { kind: 'step', id: sid })
      }
    }
  }
  return steps
}

/** Henter tid og temperatur ut av en stegtekst. Gjetter aldri – bare det som står. */
export function extractStepMeta(text: string): Pick<Step, 'durationMin' | 'durationMaxMin' | 'temperatureC'> {
  const out: Pick<Step, 'durationMin' | 'durationMaxMin' | 'temperatureC'> = {}
  const t = text.match(/(\d{2,3})\s*(?:°\s*C?|grader|℃)/i)
  if (t) out.temperatureC = parseInt(t[1], 10)

  const d = text.match(/(\d+(?:[.,]\d+)?)\s*(?:(?:-|–|til)\s*(\d+(?:[.,]\d+)?)\s*)?(min(?:utt(?:er)?)?|t(?:ime[rn]?)?)\b/i)
  if (d) {
    const unitIsHour = /^t/i.test(d[3])
    const f = unitIsHour ? 60 : 1
    out.durationMin = Math.round(parseFloat(d[1].replace(',', '.')) * f)
    if (d[2]) out.durationMaxMin = Math.round(parseFloat(d[2].replace(',', '.')) * f)
  }
  return out
}
