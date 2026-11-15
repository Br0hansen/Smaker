/**
 * Alt som snakker med Supabase. store.ts kaller disse og holder tilstanden.
 *
 * Bilder: i databasen lagres stien i bøtta (`<familie-id>/<fil>.jpg`). I appen
 * vises en signert URL. pathByUrl husker koblingen, så vi lagrer stien – ikke
 * den midlertidige URL-en – når oppskriften lagres igjen.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid, newId } from '../domain/ids'
import type { Family, FamilyMember, MemberRole, Recipe, RecipeVersion } from '../domain/types'
import { MEDIA_BUCKET } from '../lib/supabase'

const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7 // en uke – holder bildene synlige offline en stund
const pathByUrl = new Map<string, string>()

export class ConflictError extends Error {
  constructor() {
    super('Noen andre har endret oppskriften mens du redigerte.')
  }
}

function fail(error: { message: string } | null, fallback = 'Noe gikk galt. Prøv igjen.'): never {
  if (error?.message?.includes('SMAKER_CONFLICT')) throw new ConflictError()
  throw new Error(error?.message || fallback)
}

// ---------------- Familie ----------------

export interface Membership {
  familyId: string
  familyName: string
  role: MemberRole
}

export async function loadMemberships(sb: SupabaseClient, userId: string): Promise<Membership[]> {
  const { data, error } = await sb
    .from('smaker_family_members')
    .select('family_id, role, joined_at, smaker_families(name)')
    .eq('user_id', userId)
    .order('joined_at')
  if (error) fail(error)
  return (data ?? []).map((m) => ({
    familyId: m.family_id as string,
    role: m.role as MemberRole,
    familyName: (m.smaker_families as unknown as { name: string } | null)?.name ?? 'Familien',
  }))
}

export interface FamilyData {
  family: Family
  recipes: Recipe[]
  favorites: Record<string, string[]>
}

export async function loadFamily(sb: SupabaseClient, familyId: string): Promise<FamilyData> {
  const [fam, members, recipes, favs] = await Promise.all([
    sb.from('smaker_families').select('id, name').eq('id', familyId).single(),
    sb.from('smaker_family_members').select('user_id, display_name, role, color').eq('family_id', familyId).order('joined_at'),
    sb.rpc('smaker_get_recipes', { p_family: familyId }),
    sb.from('smaker_favorites').select('user_id, recipe_id'),
  ])
  if (fam.error) fail(fam.error)
  if (members.error) fail(members.error)
  if (recipes.error) fail(recipes.error)
  if (favs.error) fail(favs.error)

  const list = await withSignedUrls(sb, (recipes.data ?? []) as Recipe[])
  const ids = new Set(list.map((r) => r.id))
  const favorites: Record<string, string[]> = {}
  for (const f of favs.data ?? []) {
    if (!ids.has(f.recipe_id)) continue
    ;(favorites[f.user_id] ??= []).push(f.recipe_id)
  }
  return {
    family: {
      id: fam.data.id,
      name: fam.data.name,
      members: (members.data ?? []).map(
        (m): FamilyMember => ({ id: m.user_id, name: m.display_name, role: m.role as MemberRole, color: m.color }),
      ),
    },
    recipes: list,
    favorites,
  }
}

export async function createFamily(sb: SupabaseClient, name: string, displayName: string): Promise<string> {
  const { data, error } = await sb.rpc('smaker_create_family', { p_name: name, p_display_name: displayName })
  if (error) fail(error)
  return data as string
}

export async function acceptInvite(sb: SupabaseClient, token: string, displayName: string): Promise<string> {
  const { data, error } = await sb.rpc('smaker_accept_family_invite', { p_token: token, p_display_name: displayName })
  if (error) fail(error, 'Invitasjonen er ugyldig eller utløpt.')
  return data as string
}

export async function createInvite(sb: SupabaseClient, familyId: string): Promise<string> {
  const { data, error } = await sb.rpc('smaker_create_family_invite', { p_family: familyId })
  if (error) fail(error)
  return data as string
}

export async function updateMyName(sb: SupabaseClient, familyId: string, userId: string, name: string) {
  const { error } = await sb.from('smaker_family_members').update({ display_name: name }).eq('family_id', familyId).eq('user_id', userId)
  if (error) fail(error)
}

// ---------------- Oppskrifter ----------------

export async function loadRecipes(sb: SupabaseClient, familyId: string): Promise<Recipe[]> {
  const { data, error } = await sb.rpc('smaker_get_recipes', { p_family: familyId })
  if (error) fail(error)
  return withSignedUrls(sb, (data ?? []) as Recipe[])
}

export async function saveRecipe(sb: SupabaseClient, recipe: Omit<Recipe, 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'version'> & { version: number | null }): Promise<Recipe> {
  const payload = await prepareForSave(sb, recipe)
  const { data, error } = await sb.rpc('smaker_save_recipe', { p_recipe: payload })
  if (error) fail(error)
  const [signed] = await withSignedUrls(sb, [data as Recipe])
  return signed
}

export async function deleteRecipe(sb: SupabaseClient, recipeId: string) {
  const { error } = await sb.rpc('smaker_delete_recipe', { p_recipe: recipeId })
  if (error) fail(error)
}

export async function setFavorite(sb: SupabaseClient, userId: string, recipeId: string, on: boolean) {
  const { error } = on
    ? await sb.from('smaker_favorites').insert({ user_id: userId, recipe_id: recipeId })
    : await sb.from('smaker_favorites').delete().eq('user_id', userId).eq('recipe_id', recipeId)
  if (error && !error.message.includes('duplicate')) fail(error)
}

export async function loadVersions(sb: SupabaseClient, recipeId: string): Promise<RecipeVersion[]> {
  const { data, error } = await sb
    .from('smaker_recipe_versions')
    .select('version, saved_by, saved_at, snapshot')
    .eq('recipe_id', recipeId)
    .order('version')
  if (error) fail(error)
  return (data ?? []).map((v) => ({ recipeId, version: v.version, savedAt: v.saved_at, savedBy: v.saved_by, snapshot: v.snapshot as Recipe }))
}

// ---------------- Hjelpere ----------------

/**
 * Gjør klar en oppskrift for lagring:
 *  - ID-er som ikke er UUID (eksempeldata) får nye UUID-er, og koblingene skrives om
 *  - nye bilder (data-URL) lastes opp, og signerte URL-er byttes tilbake til stier
 */
async function prepareForSave(sb: SupabaseClient, r: Parameters<typeof saveRecipe>[1]) {
  const map = new Map<string, string>()
  const fix = (id: string) => {
    if (isUuid(id)) return id
    if (!map.has(id)) map.set(id, newId())
    return map.get(id)!
  }
  const toPath = async (url: string | undefined | null): Promise<string | null> => {
    if (!url) return null
    if (url.startsWith('data:')) return upload(sb, r.familyId, url)
    return pathByUrl.get(url) ?? url
  }
  return {
    ...r,
    id: isUuid(r.id) ? r.id : null,
    coverImage: await toPath(r.coverImage),
    ingredients: r.ingredients.map((i) => ({ ...i, id: fix(i.id) })),
    steps: r.steps.map((s) => ({ ...s, id: fix(s.id), inputs: s.inputs.map((x) => ({ ...x, id: fix(x.id) })) })),
    attachments: await Promise.all(r.attachments.map(async (a) => ({ ...a, id: isUuid(a.id) ? a.id : null, url: await toPath(a.url) }))),
  }
}

async function upload(sb: SupabaseClient, familyId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
  const path = `${familyId}/${newId()}.${ext}`
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg' })
  if (error) fail(error, 'Klarte ikke å laste opp bildet.')
  return path
}

const isStoragePath = (u: string | null | undefined): u is string => !!u && !u.startsWith('data:') && !/^https?:/.test(u)

async function withSignedUrls(sb: SupabaseClient, recipes: Recipe[]): Promise<Recipe[]> {
  const paths = [...new Set(recipes.flatMap((r) => [r.coverImage, ...r.attachments.map((a) => a.url)]).filter(isStoragePath))]
  if (!paths.length) return recipes
  const { data } = await sb.storage.from(MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
  const signed = new Map<string, string>()
  for (const d of data ?? []) {
    if (d.signedUrl && d.path) {
      signed.set(d.path, d.signedUrl)
      pathByUrl.set(d.signedUrl, d.path)
    }
  }
  const sign = (u: string | undefined | null) => (u && signed.get(u)) || u || undefined
  return recipes.map((r) => ({
    ...r,
    coverImage: sign(r.coverImage),
    attachments: r.attachments.map((a) => ({ ...a, url: sign(a.url) ?? a.url })),
  }))
}

/** Signerte URL-er utløper; ved bruk av hurtigbuffer registreres de på nytt. */
export function rememberPaths(entries: [string, string][]) {
  for (const [url, path] of entries) pathByUrl.set(url, path)
}
export function knownPaths(): [string, string][] {
  return [...pathByUrl.entries()]
}
