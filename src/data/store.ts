/**
 * Lokal lagring (localStorage) bak et lite repository-grensesnitt.
 *
 * Dette er en midlertidig "backend" til Supabase kobles på. Komponentene
 * bruker bare hookene og funksjonene under – ikke localStorage direkte – så
 * byttet til Supabase skjer her, ikke i UI-et.
 */
import { useSyncExternalStore } from 'react'
import { newId } from '../domain/ids'
import type { Family, Recipe, RecipeVersion } from '../domain/types'
import { CURRENT_MEMBER_ID, SEED_FAMILY, SEED_FAVORITES, SEED_RECIPES } from './seed'

interface State {
  family: Family
  recipes: Recipe[]
  versions: RecipeVersion[]
  favorites: Record<string, string[]>
}

const KEY = 'smaker:v1'
const listeners = new Set<() => void>()

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    /* privat modus eller blokkert lagring – bruk eksempeldata */
  }
  return {
    family: SEED_FAMILY,
    recipes: SEED_RECIPES,
    versions: SEED_RECIPES.map((r) => ({ recipeId: r.id, version: 1, savedAt: r.updatedAt, savedBy: r.updatedBy, snapshot: r })),
    favorites: SEED_FAVORITES,
  }
}

let state: State = load()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* full lagring – endringen gjelder fortsatt i denne fanen */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Andre faner
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load()
      listeners.forEach((l) => l())
    }
  })
}

// ---------- Lesing ----------

export const currentMemberId = CURRENT_MEMBER_ID

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

export const useRecipes = () => useStore((s) => s.recipes)
export const useFamily = () => useStore((s) => s.family)
export const useRecipe = (id: string | undefined) => useStore((s) => s.recipes.find((r) => r.id === id))
export const useFavorites = () => useStore((s) => s.favorites[currentMemberId] ?? EMPTY)
export const useVersions = (id: string | undefined) => useStore((s) => s.versions).filter((v) => v.recipeId === id)
const EMPTY: string[] = []

export function memberName(family: Family, id: string): string {
  return family.members.find((m) => m.id === id)?.name ?? 'Ukjent'
}

// ---------- Skriving ----------

export type RecipeInput = Omit<Recipe, 'id' | 'familyId' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'version'> & {
  id?: string
}

/** Lagrer ny eller endret oppskrift. Hver lagring blir en ny versjon. */
export function saveRecipe(input: RecipeInput): Recipe {
  const now = new Date().toISOString()
  const existing = input.id ? state.recipes.find((r) => r.id === input.id) : undefined
  const recipe: Recipe = existing
    ? { ...existing, ...input, id: existing.id, updatedBy: currentMemberId, updatedAt: now, version: existing.version + 1 }
    : {
        ...input,
        id: newId('r'),
        familyId: state.family.id,
        createdBy: currentMemberId,
        createdAt: now,
        updatedBy: currentMemberId,
        updatedAt: now,
        version: 1,
      }
  commit({
    ...state,
    recipes: existing ? state.recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...state.recipes],
    versions: [...state.versions, { recipeId: recipe.id, version: recipe.version, savedAt: now, savedBy: currentMemberId, snapshot: recipe }],
  })
  return recipe
}

/** Gjenoppretter en tidligere versjon ved å lagre den som en NY versjon – historikken bevares. */
export function restoreVersion(recipeId: string, version: number): Recipe | undefined {
  const v = state.versions.find((x) => x.recipeId === recipeId && x.version === version)
  if (!v) return undefined
  const { id, familyId: _f, createdBy: _c, createdAt: _ca, updatedBy: _u, updatedAt: _ua, version: _v, ...rest } = v.snapshot
  return saveRecipe({ ...rest, id })
}

export function toggleFavorite(recipeId: string) {
  const mine = state.favorites[currentMemberId] ?? []
  const next = mine.includes(recipeId) ? mine.filter((x) => x !== recipeId) : [...mine, recipeId]
  commit({ ...state, favorites: { ...state.favorites, [currentMemberId]: next } })
}

export function deleteRecipe(recipeId: string) {
  commit({ ...state, recipes: state.recipes.filter((r) => r.id !== recipeId) })
}

/** Lager en invitasjonslenke. Lokalt er den bare en demo – med Supabase blir den et engangstoken. */
export function createInviteLink(): string {
  const token = newId().replace(/-/g, '')
  return `${location.origin}/bli-med/${token}`
}
