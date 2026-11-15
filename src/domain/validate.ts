/**
 * Finner informasjon som mangler, så forhåndsvisningen kan markere den.
 * Ingenting her stopper lagring – bare navn, ingredienser og steg kreves.
 */
import { isToTaste } from './quantity'
import type { Id, Recipe } from './types'

export type IssueLevel = 'required' | 'missing' | 'hint'

export interface Issue {
  level: IssueLevel
  field: 'title' | 'servings' | 'time' | 'ingredients' | 'steps' | 'ingredient' | 'step'
  targetId?: Id
  message: string
}

type Checkable = Pick<Recipe, 'title' | 'servings' | 'totalMinutes' | 'ingredients' | 'steps'>

export function findIssues(r: Checkable): Issue[] {
  const issues: Issue[] = []
  if (!r.title.trim()) issues.push({ level: 'required', field: 'title', message: 'Oppskriften trenger et navn.' })
  if (r.ingredients.length === 0) issues.push({ level: 'required', field: 'ingredients', message: 'Legg til minst én ingrediens.' })
  if (r.steps.length === 0) issues.push({ level: 'required', field: 'steps', message: 'Legg til minst ett steg.' })
  if (r.servings == null) issues.push({ level: 'missing', field: 'servings', message: 'Antall porsjoner mangler.' })
  if (r.totalMinutes == null) issues.push({ level: 'missing', field: 'time', message: 'Tidsbruk mangler.' })

  const used = new Set(r.steps.flatMap((s) => s.inputs.filter((i) => i.kind === 'ingredient').map((i) => i.id)))
  for (const ing of r.ingredients) {
    if (ing.amount == null && !isToTaste(ing.name) && !ing.optional) {
      issues.push({ level: 'missing', field: 'ingredient', targetId: ing.id, message: `Mengde mangler for «${ing.name}».` })
    }
    if (r.steps.length && !used.has(ing.id)) {
      issues.push({ level: 'hint', field: 'ingredient', targetId: ing.id, message: `«${ing.name}» er ikke koblet til noe steg.` })
    }
  }
  return issues
}

export function canSave(r: Checkable): boolean {
  return !findIssues(r).some((i) => i.level === 'required')
}

export function scaleFactor(base: number | null, wanted: number | null): number {
  if (!base || !wanted) return 1
  return wanted / base
}
