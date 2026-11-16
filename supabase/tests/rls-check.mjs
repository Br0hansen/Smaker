// Tester migrasjonen og Row Level Security i PGlite (Postgres i WebAssembly) med en
// minimal etterligning av Supabase sine auth- og storage-skjemaer. Kjør: npm run test:db
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const MIG = join(dirname(fileURLToPath(import.meta.url)), '../migrations')

const db = new PGlite({ extensions: { pgcrypto } })
const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b'
const D = '00000000-0000-0000-0000-00000000000d'

// --- Minimal etterligning av Supabase ---
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema extensions; create schema auth; create schema storage;
  grant usage on schema public, extensions, storage to authenticated, anon;
  grant usage on schema auth to authenticated;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to authenticated, anon;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security; grant select, insert, delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  alter default privileges in schema public grant all on tables to authenticated;
  insert into auth.users values ('${A}', '{"name":"Anne"}'), ('${B}', '{"name":"Bjørn"}'), ('${D}', '{"name":"Dag"}');
`)
for (const f of readdirSync(MIG).sort()) await db.exec(readFileSync(join(MIG, f), 'utf8'))
console.log('✓ migrasjonen kjørte')

const as = async (uid, sql, params) => {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try { return (await db.query(sql, params)).rows } finally { await db.exec('reset role') }
}
const expectFail = async (label, fn) => { try { await fn(); console.log('✗ FEIL – burde feilet:', label); process.exitCode = 1 } catch (e) { console.log('✓', label, '→', e.message.split('\n')[0]) } }
const check = (label, cond) => { console.log(cond ? '✓' : '✗ FEIL –', label); if (!cond) process.exitCode = 1 }
const acceptInvite = async (uid, code, name = 'Test') =>
  (await as(uid, `select smaker_accept_family_invite_v2($1, $2)`, [code, name]))[0].smaker_accept_family_invite_v2

const [fam] = await as(A, `insert into smaker_families (name) values ('Familien A') returning id`)
check('A blir eier automatisk', (await as(A, `select role, display_name from smaker_family_members`))[0]?.role === 'owner')
const [rec] = await as(A, `insert into smaker_recipes (family_id, title) values ($1, 'Vafler') returning id`, [fam.id])
const [i1] = await as(A, `insert into smaker_ingredients (recipe_id, position, name, amount, unit) values ($1, 0, 'melk', 5, 'dl') returning id`, [rec.id])
const [s1] = await as(A, `insert into smaker_steps (recipe_id, position, text, action) values ($1, 0, 'Pisk', 'Pisk') returning id`, [rec.id])
const [s2] = await as(A, `insert into smaker_steps (recipe_id, position, text, action) values ($1, 1, 'Stek', 'Stek') returning id`, [rec.id])
await as(A, `insert into smaker_step_inputs (step_id, position, ingredient_id) values ($1, 0, $2)`, [s1.id, i1.id])
await as(A, `insert into smaker_step_inputs (step_id, position, input_step_id) values ($1, 0, $2)`, [s2.id, s1.id])
check('A ser egen oppskrift', (await as(A, `select * from smaker_recipes`)).length === 1)
await expectFail('steg kan ikke bygge på senere steg', () => as(A, `insert into smaker_step_inputs (step_id, position, input_step_id) values ($1, 1, $2)`, [s1.id, s2.id]))

check('B ser IKKE familien', (await as(B, `select * from smaker_families`)).length === 0)
check('B ser IKKE oppskriften', (await as(B, `select * from smaker_recipes`)).length === 0)
check('B ser IKKE ingrediensene', (await as(B, `select * from smaker_ingredients`)).length === 0)
await expectFail('B kan ikke legge oppskrift i A sin familie', () => as(B, `insert into smaker_recipes (family_id, title) values ($1, 'Inntrenger')`, [fam.id]))
await expectFail('B kan ikke melde seg inn selv', () => as(B, `insert into smaker_family_members (family_id, user_id, display_name) values ($1, $2, 'B')`, [fam.id, B]))
await expectFail('B kan ikke lage invitasjon', () => as(B, `select smaker_create_family_invite($1)`, [fam.id]))
await expectFail('B kan ikke favorisere A sin oppskrift', () => as(B, `insert into smaker_favorites (recipe_id) values ($1)`, [rec.id]))
check('B kan ikke oppdatere oppskriften', (await as(B, `update smaker_recipes set title = 'Hacket' where id = $1 returning id`, [rec.id])).length === 0)

const [{ smaker_create_family_invite: token }] = await as(A, `select smaker_create_family_invite($1)`, [fam.id])
check('A får en sekstegns invitasjonskode', /^[A-HJ-NP-Z2-9]{6}$/.test(token))
check('Bare hash lagres', (await as(A, `select token_hash from smaker_family_invites`))[0].token_hash !== token)
check('koden utløper innen én time', (await as(A, `select expires_at <= now() + interval '1 hour 1 second' as short from smaker_family_invites where token_hash = encode(extensions.digest($1, 'sha256'), 'hex')`, [token]))[0]?.short === true)
check('feil kode avvises', (await acceptInvite(B, 'FEIL22', 'Bjørn')).error === 'invalid')
check('riktig kode godtas', (await acceptInvite(B, token.toLowerCase(), 'Bjørn')).ok === true)
check('B ser oppskriften etter invitasjon', (await as(B, `select title from smaker_recipes`))[0]?.title === 'Vafler')
check('B er vanlig medlem', (await as(B, `select role from smaker_family_members where user_id = $1`, [B]))[0]?.role === 'member')
check('invitasjonen kan ikke brukes to ganger', (await acceptInvite(B, token, 'Bjørn igjen')).error === 'invalid')
check('B kan ikke gjøre seg selv til admin', (await as(B, `update smaker_family_members set role = 'admin' where user_id = $1 returning role`, [B]).catch(() => [])).length === 0)
await expectFail('eier kan ikke omgå rollefunksjonen med direkte update', () => as(A, `update smaker_family_members set role = 'admin' where family_id = $1 and user_id = $2`, [fam.id, B]))
check('eier kan gjøre medlem til administrator', (await as(A, `select smaker_set_member_role($1, $2, 'admin') as role`, [fam.id, B]))[0]?.role === 'admin')
await expectFail('administrator kan ikke endre roller', () => as(B, `select smaker_set_member_role($1, $2, 'admin')`, [fam.id, A]))
check('administrator kan fortsatt invitere medlemmer', /^[A-HJ-NP-Z2-9]{6}$/.test((await as(B, `select smaker_create_family_invite($1) as code`, [fam.id]))[0]?.code))
await expectFail('administrator kan ikke invitere en administrator', () => as(B, `select smaker_create_family_invite($1, 'admin')`, [fam.id]))
check('administrator kan ikke slette eieren', (await as(B, `delete from smaker_family_members where family_id = $1 and user_id = $2 returning user_id`, [fam.id, A])).length === 0)
check('eier kan gjøre administrator til medlem igjen', (await as(A, `select smaker_set_member_role($1, $2, 'member') as role`, [fam.id, B]))[0]?.role === 'member')
await expectFail('eier kan ikke endre sin egen rolle', () => as(A, `select smaker_set_member_role($1, $2, 'member')`, [fam.id, A]))
await as(B, `insert into smaker_favorites (recipe_id) values ($1)`, [rec.id])
check('B kan favorisere nå', (await as(B, `select * from smaker_favorites`)).length === 1)
check('A ser B sin favoritt (samme familie)', (await as(A, `select * from smaker_favorites`)).length === 1)
check('Bilde i familiens mappe er lesbart', (await as(B, `insert into storage.objects (bucket_id, name) values ('smaker-media', $1) returning id`, [`${fam.id}/vafler.jpg`])).length === 1)
await expectFail('Bilde i fremmed mappe avvises', () => as(B, `insert into storage.objects (bucket_id, name) values ('smaker-media', $1)`, ['00000000-0000-0000-0000-000000000099/x.jpg']))
await expectFail('Ugyldig mappenavn avvises uten å krasje', () => as(B, `insert into storage.objects (bucket_id, name) values ('smaker-media', 'ikke-en-uuid/x.jpg')`))
await db.exec(`insert into storage.buckets values ('annen-app', 'annen-app', false); insert into storage.objects (bucket_id, name) values ('annen-app', 'ikke-uuid/fil.txt')`)
check('Andre apper sine filer krasjer ikke reglene våre', Array.isArray(await as(B, `select * from storage.objects`)))

// ---------- App-API: smaker_create_family / smaker_save_recipe / smaker_get_recipes ----------
const C = '00000000-0000-0000-0000-00000000000c'
await db.exec(`insert into auth.users values ('${C}', '{}')`)
const [{ smaker_create_family: famC }] = await as(C, `select smaker_create_family('Familien C', 'Cecilie')`)
check('create_family gir eier med valgt navn', (await as(C, `select display_name, role from smaker_family_members where family_id = $1`, [famC]))[0]?.display_name === 'Cecilie')

const uuid = () => crypto.randomUUID()
const ing1 = uuid(), ing2 = uuid(), st1 = uuid(), st2 = uuid(), rid = uuid()
const recipe = {
  id: rid, familyId: famC, title: 'Pannekaker', servings: 4, categories: ['Middag'], version: null,
  ingredients: [{ id: ing1, name: 'egg', amount: 3, unit: null }, { id: ing2, name: 'melk', amount: 5, unit: 'dl', amountMax: null }],
  steps: [
    { id: st1, text: 'Visp egg og melk', action: 'Visp', inputs: [{ kind: 'ingredient', id: ing1 }, { kind: 'ingredient', id: ing2 }] },
    { id: st2, text: 'Stek', action: 'Stek', durationMin: 2, inputs: [{ kind: 'step', id: st1 }] },
  ],
  attachments: [],
}
const [{ smaker_save_recipe: saved }] = await as(C, `select smaker_save_recipe($1)`, [JSON.stringify(recipe)])
check('save_recipe lagrer og returnerer versjon 1', saved.version === 1 && saved.steps.length === 2)
check('grafen kommer tilbake likt', saved.steps[1].inputs.length === 1 && saved.steps[1].inputs[0].kind === 'step' && saved.steps[1].inputs[0].id === st1 && saved.steps[0].inputs.map((i) => i.id).join() === [ing1, ing2].join() && saved.ingredients[1].amount === 5 && saved.ingredients[0].unit === null)
check('versjon 1 er lagret i historikken', (await as(C, `select version from smaker_recipe_versions where recipe_id = $1`, [rid])).length === 1)

const [{ smaker_save_recipe: saved2 }] = await as(C, `select smaker_save_recipe($1)`, [JSON.stringify({ ...saved, title: 'Tynne pannekaker' })])
check('endring gir versjon 2', saved2.version === 2 && saved2.title === 'Tynne pannekaker')
await expectFail('utdatert versjon avvises (konflikt)', () => as(C, `select smaker_save_recipe($1)`, [JSON.stringify({ ...saved, title: 'Gammel' })]))
const [{ smaker_get_recipes: list }] = await as(C, `select smaker_get_recipes($1)`, [famC])
check('get_recipes gir oppskriften', list.length === 1 && list[0].title === 'Tynne pannekaker')

await expectFail('utenforstående kan ikke lagre i familien', () => as(A, `select smaker_save_recipe($1)`, [JSON.stringify({ ...recipe, id: uuid(), ingredients: [], steps: [] })]))
check('utenforstående får tom liste', (await as(A, `select smaker_get_recipes($1)`, [famC]))[0].smaker_get_recipes.length === 0)
await expectFail('steg kan ikke bygge på senere steg via save_recipe', () => as(C, `select smaker_save_recipe($1)`, [JSON.stringify({ ...saved2, steps: [{ ...recipe.steps[0], inputs: [{ kind: 'step', id: st2 }] }, recipe.steps[1]] })]))

// Favoritter synlige for familien
await as(A, `insert into smaker_favorites (recipe_id) values ($1) on conflict do nothing`, [rec.id])
check('B ser A sin favoritt i samme familie', (await as(B, `select user_id from smaker_favorites`)).length === 2)
check('C (annen familie) ser ingen favoritter', (await as(C, `select * from smaker_favorites`)).length === 0)
await expectFail('B kan ikke legge inn favoritt for A', () => as(B, `insert into smaker_favorites (user_id, recipe_id) values ($1, $2)`, [A, rec.id]))
check('B kan ikke slette A sin favoritt', (await as(B, `delete from smaker_favorites where user_id = $1 returning *`, [A])).length === 0)

// Kodeforsøk: 10 feil gir først 15 min sperre, andre gang innen 24 t gir karantene.
const [{ smaker_create_family_invite: rateToken }] = await as(A, `select smaker_create_family_invite($1)`, [fam.id])
for (let i = 0; i < 9; i++) check(`feil kode ${i + 1} registreres`, (await acceptInvite(D, `FEIL${i}X`)).error === 'invalid')
const firstLimit = await acceptInvite(D, 'FEIL9X')
check('tiende feil gir 15 minutters sperre', firstLimit.error === 'rate_limited' && firstLimit.retryAfterSeconds === 900)
check('nye forsøk avvises under sperren', (await acceptInvite(D, rateToken)).error === 'rate_limited')
await expectFail('brukeren kan ikke lese forsøkstelleren', () => as(D, `select * from smaker_invite_attempt_limits`))

await db.exec(`update smaker_invite_attempt_limits set blocked_until = now() - interval '1 second', window_started_at = now() - interval '16 minutes' where user_id = '${D}'`)
for (let i = 0; i < 9; i++) await acceptInvite(D, `IGJEN${i}`)
const secondLimit = await acceptInvite(D, 'IGJEN9')
check('ny grense innen 24 timer gir karantene', secondLimit.error === 'quarantine' && secondLimit.retryAfterSeconds === 86400)
check('gyldig kode avvises under karantenen', (await acceptInvite(D, rateToken)).error === 'quarantine')

await db.exec(`update smaker_invite_attempt_limits set quarantine_until = now() - interval '1 second' where user_id = '${D}'`)
check('gyldig kode virker etter karantenen', (await acceptInvite(D, rateToken, 'Dag')).ok === true)
check('vellykket kode nullstiller forsøkstelleren', (await db.query(`select * from smaker_invite_attempt_limits where user_id = '${D}'`)).rows.length === 0)
check('eldre appversjon kan ikke omgå sperren', (await as(D, `select smaker_accept_family_invite('x', 'Dag')`))[0].smaker_accept_family_invite === null)
check('forsøk fra eldre appversjon telles', (await db.query(`select failed_attempts from smaker_invite_attempt_limits where user_id = '${D}'`)).rows[0]?.failed_attempts === 1)

// Alle eiere kan slette familien, mens vanlige medlemmer ikke kan.
const [{ smaker_create_family: deleteFam }] = await as(A, `select smaker_create_family('Familien som skal slettes', 'Anne')`)
const [{ smaker_create_family_invite: deleteInvite }] = await as(A, `select smaker_create_family_invite($1)`, [deleteFam])
check('B blir med i familien som skal slettes', (await acceptInvite(B, deleteInvite, 'Bjørn')).ok === true)
check('vanlig medlem kan ikke slette familien', (await as(B, `delete from smaker_families where id = $1 returning id`, [deleteFam])).length === 0)
await as(A, `select smaker_set_member_role($1, $2, 'owner')`, [deleteFam, B])
await as(B, `select smaker_set_member_role($1, $2, 'member')`, [deleteFam, A])
await expectFail('gjenværende eier kan ikke nedgradere seg selv', () => as(B, `select smaker_set_member_role($1, $2, 'member')`, [deleteFam, B]))
check('en annen eier kan slette familien', (await as(B, `delete from smaker_families where id = $1 returning id`, [deleteFam])).length === 1)
check('sletting fjerner medlemskapene', (await as(A, `select * from smaker_family_members where family_id = $1`, [deleteFam])).length === 0)

await as(C, `select smaker_delete_recipe($1)`, [rid])
check('slettet oppskrift forsvinner fra listen', (await as(C, `select smaker_get_recipes($1)`, [famC]))[0].smaker_get_recipes.length === 0)

// ---------- Bruk av bildelesing ----------
await db.exec(`insert into smaker_ai_usage (user_id, model, input_tokens, output_tokens) values ('${A}', 'test', 1, 1), ('${B}', 'test', 1, 1)`)
check('A ser bare egen bruk av bildelesing', (await as(A, `select user_id from smaker_ai_usage`)).every((r) => r.user_id === A))
await expectFail('brukere kan ikke skrive bruk selv (bare Edge Function-en)', () => as(A, `insert into smaker_ai_usage (user_id, model) values ($1, 'juks')`, [A]))

// ---------- Foreslåtte steg og kildelenke ----------
{
  const r2 = uuid(), i2 = uuid(), s2a = uuid()
  const [{ smaker_save_recipe: saved3 }] = await as(C, `select smaker_save_recipe($1)`, [JSON.stringify({
    id: r2, familyId: famC, title: 'Fra nett', sourceUrl: 'https://www.matprat.no/oppskrifter/kos/vafler/', categories: [], version: null,
    ingredients: [{ id: i2, name: 'egg', amount: 2 }],
    steps: [{ id: s2a, text: 'Pisk eggene', action: 'Pisk', suggested: true, inputs: [{ kind: 'ingredient', id: i2 }] }],
    attachments: [],
  })])
  check('kildelenke lagres og kommer tilbake', saved3.sourceUrl === 'https://www.matprat.no/oppskrifter/kos/vafler/')
  check('foreslått steg merkes og kommer tilbake', saved3.steps[0].suggested === true)
  const [{ smaker_save_recipe: saved4 }] = await as(C, `select smaker_save_recipe($1)`, [JSON.stringify({ ...saved3, steps: [{ ...saved3.steps[0], suggested: false }] })])
  check('godkjent steg mister merket', saved4.steps[0].suggested === false && saved4.version === 2)
  await expectFail('kildelenke må være http(s)', () => as(C, `select smaker_save_recipe($1)`, [JSON.stringify({ ...saved4, id: uuid(), version: null, sourceUrl: 'javascript:alert(1)', ingredients: [], steps: [] })]))
}
