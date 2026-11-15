-- =====================================================================
-- Smaker – grunnskjema
--
-- Prosjektet (DailyPep) deles med andre apper. Alt her har prefikset
-- smaker_ (tabeller, typer, funksjoner, bøtte), som de andre appene
-- (dailypep_, ting_, things_).
--
-- En oppskrift lagres som en graf:
--   smaker_ingredients  → kilder
--   smaker_steps        → handlinger, hver gir ett mellomprodukt (smaker_steps.produces)
--   smaker_step_inputs  → hva som går inn i hvert steg: en ingrediens ELLER
--                  resultatet av et tidligere steg
-- Klassisk visning og Recipe Grid beregnes begge fra disse tabellene.
--
-- Tilgang: alt er privat per familie, håndhevet med Row Level Security.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Familier og medlemmer
-- ---------------------------------------------------------------------

create table public.smaker_families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 80),
  created_by  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now()
);

create type public.smaker_member_role as enum ('owner', 'admin', 'member');

create table public.smaker_family_members (
  family_id     uuid not null references public.smaker_families (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          public.smaker_member_role not null default 'member',
  display_name  text not null check (length(trim(display_name)) between 1 and 40),
  color         text not null default '#75665b',
  joined_at     timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index smaker_family_members_user_idx on public.smaker_family_members (user_id);

-- Invitasjoner: bare en hash av tokenet lagres. Selve lenken vises én gang.
create table public.smaker_family_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.smaker_families (id) on delete cascade,
  token_hash  text not null unique,
  role        public.smaker_member_role not null default 'member' check (role <> 'owner'),
  created_by  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_at     timestamptz,
  used_by     uuid references auth.users (id)
);

-- ---------------------------------------------------------------------
-- Oppskrifter
-- ---------------------------------------------------------------------

create table public.smaker_recipes (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.smaker_families (id) on delete cascade,
  title          text not null check (length(trim(title)) between 1 and 160),
  description    text,
  story          text,                         -- personlig historie
  origin         text,                         -- "Bestemor", "Mamma"
  servings       integer check (servings > 0), -- null = ikke oppgitt
  servings_unit  text,                         -- "vafler", "pizzaer"
  prep_minutes   integer check (prep_minutes >= 0),
  total_minutes  integer check (total_minutes >= 0),
  categories     text[] not null default '{}',
  cover_path     text,                         -- sti i Storage
  created_by     uuid not null default auth.uid() references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_by     uuid not null default auth.uid() references auth.users (id),
  updated_at     timestamptz not null default now(),
  version        integer not null default 1,
  deleted_at     timestamptz                   -- myk sletting, kan angres
);
create index smaker_recipes_family_idx on public.smaker_recipes (family_id) where deleted_at is null;

create table public.smaker_ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.smaker_recipes (id) on delete cascade,
  position    integer not null,
  name        text not null,
  amount      numeric check (amount >= 0),     -- null = ukjent / etter smak
  amount_max  numeric check (amount_max >= amount),
  unit        text,
  note        text,
  group_name  text,                            -- "Til sausen"
  optional    boolean not null default false,
  unique (recipe_id, position)
);

create table public.smaker_steps (
  id                uuid primary key default gen_random_uuid(),
  recipe_id         uuid not null references public.smaker_recipes (id) on delete cascade,
  position          integer not null,
  text              text not null,
  action            text not null,             -- kort handling i rutenettet
  produces          text,                      -- navn på mellomproduktet
  duration_min      integer check (duration_min >= 0),
  duration_max_min  integer check (duration_max_min >= duration_min),
  temperature_c     integer,
  unique (recipe_id, position)
);

-- Kantene i grafen. Nøyaktig én av ingredient_id / input_step_id er satt.
create table public.smaker_step_inputs (
  step_id        uuid not null references public.smaker_steps (id) on delete cascade,
  position       integer not null,
  ingredient_id  uuid references public.smaker_ingredients (id) on delete cascade,
  input_step_id  uuid references public.smaker_steps (id) on delete cascade,
  primary key (step_id, position),
  check ((ingredient_id is null) <> (input_step_id is null)),
  check (input_step_id is distinct from step_id)
);

-- Et steg kan bare bruke ingredienser fra samme oppskrift og resultatet av TIDLIGERE steg.
create function public.smaker_check_step_input() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_recipe uuid;
  v_pos    integer;
begin
  select recipe_id, position into v_recipe, v_pos from public.smaker_steps where id = new.step_id;
  if new.ingredient_id is not null and not exists (
    select 1 from public.smaker_ingredients where id = new.ingredient_id and recipe_id = v_recipe
  ) then
    raise exception 'Ingrediensen tilhører en annen oppskrift';
  end if;
  if new.input_step_id is not null and not exists (
    select 1 from public.smaker_steps where id = new.input_step_id and recipe_id = v_recipe and position < v_pos
  ) then
    raise exception 'Et steg kan bare bygge på tidligere steg i samme oppskrift';
  end if;
  return new;
end $$;

create constraint trigger smaker_step_inputs_valid
  after insert or update on public.smaker_step_inputs
  deferrable initially deferred
  for each row execute function public.smaker_check_step_input();

create type public.smaker_attachment_kind as enum ('photo', 'original-scan');

create table public.smaker_attachments (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.smaker_recipes (id) on delete cascade,
  kind          public.smaker_attachment_kind not null,
  storage_path  text not null,
  caption       text,
  created_by    uuid not null default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now()
);

create table public.smaker_favorites (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id   uuid not null references public.smaker_recipes (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- Versjonshistorikk: et fullt øyeblikksbilde (oppskrift + ingredienser + steg + koblinger)
-- per lagring. Gjenoppretting = lagre et gammelt øyeblikksbilde som ny versjon.
create table public.smaker_recipe_versions (
  recipe_id  uuid not null references public.smaker_recipes (id) on delete cascade,
  version    integer not null,
  saved_by   uuid not null default auth.uid() references auth.users (id),
  saved_at   timestamptz not null default now(),
  snapshot   jsonb not null,
  primary key (recipe_id, version)
);

-- ---------------------------------------------------------------------
-- Hjelpefunksjoner for tilgang (security definer: unngår rekursjon i RLS)
-- ---------------------------------------------------------------------

create function public.smaker_is_family_member(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.smaker_family_members
    where family_id = p_family and user_id = (select auth.uid())
  )
$$;

create function public.smaker_has_family_role(p_family uuid, p_roles public.smaker_member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.smaker_family_members
    where family_id = p_family and user_id = (select auth.uid()) and role = any (p_roles)
  )
$$;

create function public.smaker_can_access_recipe(p_recipe uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.smaker_recipes r
    join public.smaker_family_members m on m.family_id = r.family_id
    where r.id = p_recipe and m.user_id = (select auth.uid())
  )
$$;

create function public.smaker_can_access_step(p_step uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.smaker_can_access_recipe((select recipe_id from public.smaker_steps where id = p_step))
$$;

-- Den som oppretter en familie blir eier automatisk.
create function public.smaker_add_family_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.smaker_family_members (family_id, user_id, role, display_name)
  values (
    new.id,
    new.created_by,
    'owner',
    coalesce(
      (select raw_user_meta_data ->> 'name' from auth.users where id = new.created_by),
      'Meg'
    )
  );
  return new;
end $$;

create trigger smaker_families_add_owner
  after insert on public.smaker_families
  for each row execute function public.smaker_add_family_owner();

-- Lager en invitasjon og returnerer tokenet (vises bare denne ene gangen).
create function public.smaker_create_family_invite(p_family uuid, p_role public.smaker_member_role default 'member')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'base64');
begin
  if not public.smaker_has_family_role(p_family, array['owner', 'admin']::public.smaker_member_role[]) then
    raise exception 'Bare eier eller administrator kan invitere';
  end if;
  if p_role = 'owner' then
    raise exception 'Kan ikke invitere nye eiere';
  end if;
  v_token := translate(v_token, '+/=', '-_');
  insert into public.smaker_family_invites (family_id, token_hash, role)
  values (p_family, encode(extensions.digest(v_token, 'sha256'), 'hex'), p_role);
  return v_token;
end $$;

-- Tar imot en invitasjon. Engangs, med utløpstid.
create function public.smaker_accept_family_invite(p_token text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.smaker_family_invites;
begin
  if (select auth.uid()) is null then
    raise exception 'Du må være logget inn';
  end if;

  select * into v_invite
  from public.smaker_family_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found or v_invite.used_at is not null or v_invite.expires_at < now() then
    raise exception 'Invitasjonen er ugyldig eller utløpt';
  end if;

  insert into public.smaker_family_members (family_id, user_id, role, display_name)
  values (v_invite.family_id, (select auth.uid()), v_invite.role, p_display_name)
  on conflict (family_id, user_id) do nothing;

  update public.smaker_family_invites
  set used_at = now(), used_by = (select auth.uid())
  where id = v_invite.id;

  return v_invite.family_id;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.smaker_families        enable row level security;
alter table public.smaker_family_members  enable row level security;
alter table public.smaker_family_invites  enable row level security;
alter table public.smaker_recipes         enable row level security;
alter table public.smaker_ingredients     enable row level security;
alter table public.smaker_steps           enable row level security;
alter table public.smaker_step_inputs     enable row level security;
alter table public.smaker_attachments     enable row level security;
alter table public.smaker_favorites       enable row level security;
alter table public.smaker_recipe_versions enable row level security;

-- smaker_families
create policy "medlemmer ser familien" on public.smaker_families
  for select to authenticated using (public.smaker_is_family_member(id) or created_by = (select auth.uid()));
create policy "innlogget kan opprette familie" on public.smaker_families
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "eier/admin endrer familien" on public.smaker_families
  for update to authenticated using (public.smaker_has_family_role(id, array['owner', 'admin']::public.smaker_member_role[]));
create policy "eier sletter familien" on public.smaker_families
  for delete to authenticated using (public.smaker_has_family_role(id, array['owner']::public.smaker_member_role[]));

-- smaker_family_members (nye medlemmer kommer inn via smaker_accept_family_invite)
create policy "medlemmer ser hverandre" on public.smaker_family_members
  for select to authenticated using (public.smaker_is_family_member(family_id));
create policy "endre eget navn, eller admin endrer" on public.smaker_family_members
  for update to authenticated
  using (user_id = (select auth.uid()) or public.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[]))
  with check (
    -- vanlige medlemmer kan ikke gi seg selv en ny rolle
    public.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[])
    or role = (select m.role from public.smaker_family_members m where m.family_id = smaker_family_members.family_id and m.user_id = (select auth.uid()))
  );
create policy "forlate familien, eller admin fjerner" on public.smaker_family_members
  for delete to authenticated
  using ((user_id = (select auth.uid()) and role <> 'owner') or public.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[]));

-- smaker_family_invites (opprettes via smaker_create_family_invite)
create policy "admin ser invitasjoner" on public.smaker_family_invites
  for select to authenticated using (public.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[]));
create policy "admin trekker tilbake invitasjoner" on public.smaker_family_invites
  for delete to authenticated using (public.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[]));

-- smaker_recipes
create policy "familien ser oppskrifter" on public.smaker_recipes
  for select to authenticated using (public.smaker_is_family_member(family_id));
create policy "familien legger til oppskrifter" on public.smaker_recipes
  for insert to authenticated with check (public.smaker_is_family_member(family_id) and created_by = (select auth.uid()));
create policy "familien redigerer oppskrifter" on public.smaker_recipes
  for update to authenticated using (public.smaker_is_family_member(family_id)) with check (public.smaker_is_family_member(family_id));
create policy "forfatter eller admin sletter" on public.smaker_recipes
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[]));

-- ingredienser, steg, koblinger, vedlegg, versjoner: følger oppskriften
create policy "via oppskrift" on public.smaker_ingredients
  for all to authenticated using (public.smaker_can_access_recipe(recipe_id)) with check (public.smaker_can_access_recipe(recipe_id));
create policy "via oppskrift" on public.smaker_steps
  for all to authenticated using (public.smaker_can_access_recipe(recipe_id)) with check (public.smaker_can_access_recipe(recipe_id));
create policy "via steg" on public.smaker_step_inputs
  for all to authenticated using (public.smaker_can_access_step(step_id)) with check (public.smaker_can_access_step(step_id));
create policy "via oppskrift" on public.smaker_attachments
  for all to authenticated using (public.smaker_can_access_recipe(recipe_id)) with check (public.smaker_can_access_recipe(recipe_id));
create policy "se versjoner" on public.smaker_recipe_versions
  for select to authenticated using (public.smaker_can_access_recipe(recipe_id));
create policy "lagre versjoner" on public.smaker_recipe_versions
  for insert to authenticated with check (public.smaker_can_access_recipe(recipe_id) and saved_by = (select auth.uid()));

-- favoritter: egne, og bare for oppskrifter man har tilgang til
create policy "egne favoritter" on public.smaker_favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.smaker_can_access_recipe(recipe_id));

-- Bare våre egne funksjoner – prosjektet deles med andre apper, så ingen "on all functions".
revoke execute on function public.smaker_check_step_input() from anon, public;
revoke execute on function public.smaker_add_family_owner() from anon, public;
revoke execute on function public.smaker_is_family_member(uuid) from anon, public;
revoke execute on function public.smaker_has_family_role(uuid, public.smaker_member_role[]) from anon, public;
revoke execute on function public.smaker_can_access_recipe(uuid) from anon, public;
revoke execute on function public.smaker_can_access_step(uuid) from anon, public;
revoke execute on function public.smaker_create_family_invite(uuid, public.smaker_member_role) from anon, public;
revoke execute on function public.smaker_accept_family_invite(text, text) from anon, public;
grant execute on function public.smaker_create_family_invite(uuid, public.smaker_member_role) to authenticated;
grant execute on function public.smaker_accept_family_invite(text, text) to authenticated;
grant execute on function public.smaker_is_family_member(uuid) to authenticated;
grant execute on function public.smaker_has_family_role(uuid, public.smaker_member_role[]) to authenticated;
grant execute on function public.smaker_can_access_recipe(uuid) to authenticated;
grant execute on function public.smaker_can_access_step(uuid) to authenticated;

-- Smaker krever alltid innlogging: anon får ingen tabelltilgang (RLS ville uansett stoppet dem).
revoke all on table
  public.smaker_families, public.smaker_family_members, public.smaker_family_invites,
  public.smaker_recipes, public.smaker_ingredients, public.smaker_steps, public.smaker_step_inputs,
  public.smaker_attachments, public.smaker_favorites, public.smaker_recipe_versions
from anon;

-- ---------------------------------------------------------------------
-- Lagring av bilder: privat bøtte, mappe per familie: <family_id>/<fil>
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('smaker-media', 'smaker-media', false)
on conflict (id) do nothing;

-- Mappenavnet sammenlignes som tekst: en uuid-konvertering kunne feilet på filer i de
-- andre appenes bøtter (Postgres garanterer ikke at bucket_id-sjekken kjøres først).
create function public.smaker_can_access_folder(p_folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.smaker_family_members
    where family_id::text = p_folder and user_id = (select auth.uid())
  )
$$;
revoke execute on function public.smaker_can_access_folder(text) from anon, public;
grant execute on function public.smaker_can_access_folder(text) to authenticated;

create policy "smaker: familien leser bilder" on storage.objects
  for select to authenticated
  using (bucket_id = 'smaker-media' and public.smaker_can_access_folder((storage.foldername(name))[1]));
create policy "smaker: familien laster opp bilder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'smaker-media' and public.smaker_can_access_folder((storage.foldername(name))[1]));
create policy "smaker: familien sletter bilder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'smaker-media' and public.smaker_can_access_folder((storage.foldername(name))[1]));
