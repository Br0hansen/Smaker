/**
 * Appens tilstand og handlinger. Komponentene bruker bare hookene og
 * funksjonene her – aldri Supabase eller localStorage direkte.
 *
 * To moduser:
 *  - remote: Supabase (innlogging med magisk lenke/kode, familie, sanntid).
 *    Siste kjente data hurtigbufres per bruker, så oppskriftene kan leses offline.
 *  - local: demomodus med eksempeldata i nettleseren (når Supabase ikke er
 *    konfigurert, eller VITE_SMAKER_LOCAL=1).
 */
import { useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { newId } from '../domain/ids'
import type { Family, Recipe, RecipeVersion } from '../domain/types'
import { supabase } from '../lib/supabase'
import * as remote from './remote'
import { CURRENT_MEMBER_ID, SEED_FAMILY, SEED_FAVORITES, SEED_RECIPES } from './seed'

export type Status = 'loading' | 'signed-out' | 'onboarding' | 'ready'

interface State {
  mode: 'local' | 'remote'
  status: Status
  userId: string
  email?: string
  family: Family
  recipes: Recipe[]
  versions: RecipeVersion[]
  favorites: Record<string, string[]>
  /** Siste feil ved synkronisering (vises diskret). */
  syncError?: string
}

const EMPTY_FAMILY: Family = { id: '', name: '', members: [] }
const listeners = new Set<() => void>()
let state: State
let channel: RealtimeChannel | null = null

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  if (state.mode === 'local') persistLocal()
  else if (state.status === 'ready') persistCache()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// =====================================================================
// Lesing (hooks)
// =====================================================================

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

const EMPTY: string[] = []
export const useStatus = () => useStore((s) => s.status)
export const useMode = () => useStore((s) => s.mode)
export const useEmail = () => useStore((s) => s.email)
export const useUserId = () => useStore((s) => s.userId)
export const useRecipes = () => useStore((s) => s.recipes)
export const useFamily = () => useStore((s) => s.family)
export const useRecipe = (id: string | undefined) => useStore((s) => s.recipes.find((r) => r.id === id))
export const useFavorites = () => useStore((s) => s.favorites[s.userId] ?? EMPTY)
export const useVersions = (id: string | undefined) => useStore((s) => s.versions).filter((v) => v.recipeId === id)
export const useSyncError = () => useStore((s) => s.syncError)

export function memberName(family: Family, id: string): string {
  return family.members.find((m) => m.id === id)?.name ?? 'Ukjent'
}

// =====================================================================
// Skriving
// =====================================================================

export type RecipeInput = Omit<Recipe, 'id' | 'familyId' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'version'> & {
  id?: string
}

export { ConflictError } from './remote'

/** Lagrer ny eller endret oppskrift. Hver lagring blir en ny versjon. */
export async function saveRecipe(input: RecipeInput): Promise<Recipe> {
  const existing = input.id ? state.recipes.find((r) => r.id === input.id) : undefined
  if (state.mode === 'local') return saveLocal(input, existing)

  try {
    const saved = await remote.saveRecipe(supabase!, {
      ...input,
      id: existing?.id ?? input.id ?? newId(),
      familyId: state.family.id,
      version: existing?.version ?? null,
    })
    upsertRecipe(saved)
    // Versjonslisten for oppskriften er utdatert nå
    set({ versions: state.versions.filter((v) => v.recipeId !== saved.id) })
    return saved
  } catch (e) {
    if (e instanceof remote.ConflictError) void refreshRecipes()
    throw e
  }
}

/** Gjenoppretter en tidligere versjon ved å lagre den som en NY versjon – historikken bevares. */
export async function restoreVersion(recipeId: string, version: number): Promise<Recipe | undefined> {
  const v = state.versions.find((x) => x.recipeId === recipeId && x.version === version)
  if (!v) return undefined
  const { id, familyId: _f, createdBy: _c, createdAt: _ca, updatedBy: _u, updatedAt: _ua, version: _v, ...rest } = v.snapshot
  return saveRecipe({ ...rest, id })
}

export async function loadVersions(recipeId: string) {
  if (state.mode === 'local') return
  const list = await remote.loadVersions(supabase!, recipeId)
  set({ versions: [...state.versions.filter((v) => v.recipeId !== recipeId), ...list] })
}

export async function toggleFavorite(recipeId: string) {
  const mine = state.favorites[state.userId] ?? []
  const on = !mine.includes(recipeId)
  const next = on ? [...mine, recipeId] : mine.filter((x) => x !== recipeId)
  const before = state.favorites
  set({ favorites: { ...state.favorites, [state.userId]: next } }) // med en gang i UI-et
  if (state.mode === 'local') return
  try {
    await remote.setFavorite(supabase!, state.userId, recipeId, on)
  } catch (e) {
    set({ favorites: before })
    throw e
  }
}

export async function deleteRecipe(recipeId: string) {
  if (state.mode === 'remote') await remote.deleteRecipe(supabase!, recipeId)
  set({ recipes: state.recipes.filter((r) => r.id !== recipeId) })
}

export interface FamilyInvite {
  code: string
  url: string
}

/** Lager en sekstegns engangskode som går ut etter én time. */
export async function createInviteLink(): Promise<FamilyInvite> {
  const code = state.mode === 'remote' ? await remote.createInvite(supabase!, state.family.id) : localInviteCode()
  return { code, url: `${appUrl()}bli-med/${encodeURIComponent(code)}` }
}

function localInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
}

export async function updateMyName(name: string) {
  if (state.mode === 'remote') await remote.updateMyName(supabase!, state.family.id, state.userId, name)
  set({ family: { ...state.family, members: state.family.members.map((m) => (m.id === state.userId ? { ...m, name } : m)) } })
}

/** Sletter aktiv familie. Serveren godkjenner handlingen bare for eiere. */
export async function deleteFamily() {
  if (state.mode !== 'remote') throw new Error('Familier kan ikke slettes i demomodus.')
  const familyId = state.family.id
  const me = state.family.members.find((member) => member.id === state.userId)
  if (!familyId || me?.role !== 'owner') throw new Error('Bare en eier kan slette familien.')

  await remote.deleteFamily(supabase!, familyId)

  if (channel) void supabase!.removeChannel(channel)
  channel = null
  try {
    localStorage.removeItem(FAMILY_KEY)
    localStorage.removeItem(cacheKey(state.userId))
  } catch { /* privat modus – ikke kritisk */ }

  // Slettingen er allerede fullført. Tøm derfor den gamle familien med en gang,
  // også hvis lasting av et annet medlemskap skulle feile etterpå.
  set({ status: 'onboarding', family: EMPTY_FAMILY, recipes: [], versions: [], favorites: {}, syncError: undefined })
  try {
    const memberships = await remote.loadMemberships(supabase!, state.userId)
    if (memberships.length > 0) await openFamily(memberships[0].familyId)
  } catch {
    set({ syncError: 'Familien er slettet, men andre familier kunne ikke lastes akkurat nå.' })
  }
}

/** Legger eksempeloppskriftene inn i familiens kokebok (fine å starte med). */
export async function importSampleRecipes() {
  for (const r of [...SEED_RECIPES].reverse()) {
    const { id: _id, familyId: _f, createdBy: _c, createdAt: _ca, updatedBy: _u, updatedAt: _ua, version: _v, ...rest } = r
    await saveRecipe(rest)
  }
}

function upsertRecipe(r: Recipe) {
  const exists = state.recipes.some((x) => x.id === r.id)
  set({ recipes: exists ? state.recipes.map((x) => (x.id === r.id ? r : x)) : [r, ...state.recipes] })
}

// =====================================================================
// Innlogging og familie (remote)
// =====================================================================

const INVITE_KEY = 'smaker:invite'
/** Full adresse til appen, f.eks. https://br0hansen.github.io/Smaker/ */
export const appUrl = () => location.origin + import.meta.env.BASE_URL

export function pendingInvite(): string | null {
  try { return localStorage.getItem(INVITE_KEY) } catch { return null }
}
function clearInvite() {
  try { localStorage.removeItem(INVITE_KEY) } catch { /* ignorer */ }
}

/** Fanger opp /bli-med/<token> før ruteren starter, og husker invitasjonen til etter innlogging. */
function captureInviteFromUrl() {
  const m = location.pathname.match(/\/bli-med\/([^/?#]+)/)
  if (!m) return
  try { localStorage.setItem(INVITE_KEY, decodeURIComponent(m[1])) } catch { /* ignorer */ }
  history.replaceState(null, '', import.meta.env.BASE_URL)
}

/** Henter token fra en innlimt invitasjonslenke eller kode. */
export function parseInvite(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  const m = t.match(/\/bli-med\/([^/?#\s]+)/)
  const code = m ? decodeURIComponent(m[1]) : t
  return code.replace(/[\s-]/g, '').toUpperCase()
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase!.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: appUrl(), shouldCreateUser: true },
  })
  if (error) throw new Error(authMessage(error.message))
}

export async function verifyCode(email: string, code: string) {
  const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type: 'email' })
  if (error) throw new Error(authMessage(error.message))
}

export async function signOut() {
  await supabase?.auth.signOut()
}

export async function createFamily(name: string, displayName: string) {
  const id = await remote.createFamily(supabase!, name.trim(), displayName.trim())
  await openFamily(id)
}

export async function joinFamily(token: string, displayName: string) {
  const id = await remote.acceptInvite(supabase!, token, displayName.trim())
  clearInvite()
  await openFamily(id)
}

function authMessage(msg: string): string {
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Du har bedt om mange lenker på kort tid. Vent et minutt og prøv igjen.'
  if (/expired|invalid/i.test(msg)) return 'Koden er feil eller utløpt. Be om en ny lenke.'
  if (/email/i.test(msg) && /valid/i.test(msg)) return 'Sjekk at e-postadressen er riktig skrevet.'
  return msg
}

// ---------------------------------------------------------------------

const FAMILY_KEY = 'smaker:family'
const cacheKey = (uid: string) => `smaker:cache:${uid}`

async function onSignedIn(userId: string, email?: string) {
  if (state.userId === userId && state.status === 'ready') return
  set({ userId, email, status: 'loading' })

  // Vis siste kjente data med en gang (og offline)
  const cached = readCache(userId)
  if (cached && !pendingInvite()) set({ ...cached, status: 'ready' })

  try {
    const memberships = await remote.loadMemberships(supabase!, userId)
    if (pendingInvite() || memberships.length === 0) {
      set({ status: 'onboarding' })
      return
    }
    let chosen: string | null = null
    try { chosen = localStorage.getItem(FAMILY_KEY) } catch { /* ignorer */ }
    const familyId = memberships.find((m) => m.familyId === chosen)?.familyId ?? memberships[0].familyId
    await openFamily(familyId)
  } catch (e) {
    // Offline: behold hurtigbufferen hvis vi har den
    if (cached) set({ status: 'ready', syncError: 'Frakoblet – viser lagrede oppskrifter.' })
    else set({ status: 'signed-out', syncError: (e as Error).message })
  }
}

async function openFamily(familyId: string) {
  const data = await remote.loadFamily(supabase!, familyId)
  try { localStorage.setItem(FAMILY_KEY, familyId) } catch { /* ignorer */ }
  set({ ...data, versions: [], status: 'ready', syncError: undefined })
  listenForChanges(familyId)
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined
async function refreshRecipes() {
  if (state.mode !== 'remote' || state.status !== 'ready' || !state.family.id) return
  try {
    const data = await remote.loadFamily(supabase!, state.family.id)
    set({ ...data, syncError: undefined })
  } catch {
    set({ syncError: 'Frakoblet – viser lagrede oppskrifter.' })
  }
}

/** Sanntid: når noen i familien lagrer, hentes oppskriftene på nytt. */
function listenForChanges(familyId: string) {
  if (channel) void supabase!.removeChannel(channel)
  channel = supabase!
    .channel(`smaker-family-${familyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'smaker_recipes', filter: `family_id=eq.${familyId}` }, () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(refreshRecipes, 400)
    })
    .subscribe()
}

function onSignedOut() {
  if (channel) void supabase!.removeChannel(channel)
  channel = null
  set({ status: 'signed-out', userId: '', email: undefined, family: EMPTY_FAMILY, recipes: [], favorites: {}, versions: [] })
}

function persistCache() {
  if (!state.userId) return
  try {
    localStorage.setItem(
      cacheKey(state.userId),
      JSON.stringify({ family: state.family, recipes: state.recipes, favorites: state.favorites, paths: remote.knownPaths() }),
    )
  } catch { /* full lagring – ikke kritisk */ }
}

function readCache(uid: string): Pick<State, 'family' | 'recipes' | 'favorites'> | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    if (!raw) return null
    const c = JSON.parse(raw)
    remote.rememberPaths(c.paths ?? [])
    return { family: c.family, recipes: c.recipes, favorites: c.favorites }
  } catch {
    return null
  }
}

// =====================================================================
// Lokal demomodus
// =====================================================================

const LOCAL_KEY = 'smaker:v1'

function loadLocal(): State {
  const base: State = {
    mode: 'local',
    status: 'ready',
    userId: CURRENT_MEMBER_ID,
    family: SEED_FAMILY,
    recipes: SEED_RECIPES,
    versions: SEED_RECIPES.map((r) => ({ recipeId: r.id, version: 1, savedAt: r.updatedAt, savedBy: r.updatedBy, snapshot: r })),
    favorites: SEED_FAVORITES,
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return { ...base, ...JSON.parse(raw), mode: 'local', status: 'ready', userId: CURRENT_MEMBER_ID }
  } catch { /* privat modus – bruk eksempeldata */ }
  return base
}

function persistLocal() {
  try {
    const { family, recipes, versions, favorites } = state
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ family, recipes, versions, favorites }))
  } catch { /* full lagring */ }
}

function saveLocal(input: RecipeInput, existing?: Recipe): Recipe {
  const now = new Date().toISOString()
  const recipe: Recipe = existing
    ? { ...existing, ...input, id: existing.id, updatedBy: state.userId, updatedAt: now, version: existing.version + 1 }
    : { ...input, id: newId(), familyId: state.family.id, createdBy: state.userId, createdAt: now, updatedBy: state.userId, updatedAt: now, version: 1 }
  set({
    recipes: existing ? state.recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...state.recipes],
    versions: [...state.versions, { recipeId: recipe.id, version: recipe.version, savedAt: now, savedBy: state.userId, snapshot: recipe }],
  })
  return recipe
}

// =====================================================================
// Oppstart
// =====================================================================

if (supabase) {
  state = { mode: 'remote', status: 'loading', userId: '', family: EMPTY_FAMILY, recipes: [], versions: [], favorites: {} }
  captureInviteFromUrl()
  supabase.auth.onAuthStateChange((event, session) => {
    // Kall ut av auth-låsen før vi gjør nye Supabase-kall
    setTimeout(() => {
      if (session?.user) void onSignedIn(session.user.id, session.user.email ?? undefined)
      else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') onSignedOut()
    }, 0)
  })
  window.addEventListener('online', () => void refreshRecipes())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshRecipes()
  })
} else {
  state = loadLocal()
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_KEY) {
      state = loadLocal()
      listeners.forEach((l) => l())
    }
  })
}
