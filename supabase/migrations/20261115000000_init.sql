-- =====================================================================
-- Smaker – grunnskjema
--
-- En oppskrift lagres som en graf:
--   ingredients  → kilder
--   steps        → handlinger, hver gir ett mellomprodukt (steps.produces)
--   step_inputs  → hva som går inn i hvert steg: en ingrediens ELLER
--                  resultatet av et tidligere steg
-- Klassisk visning og Recipe Grid beregnes begge fra disse tabellene.
--
-- Tilgang: alt er privat per familie, håndhevet med Row Level Security.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Familier og medlemmer
-- ---------------------------------------------------------------------

create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 80),
  created_by  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'admin', 'member');

create table public.family_members (
  family_id     uuid not null references public.families (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          public.member_role not null default 'member',
  display_name  text not null check (length(trim(display_name)) between 1 and 40),
  color         text not null default '#75665b',
  joined_at     timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);

-- Invitasjoner: bare en hash av tokenet lagres. Selve lenken vises én gang.
create table public.family_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  token_hash  text not null unique,
  role        public.member_role not null default 'member' check (role <> 'owner'),
  created_by  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_at     timestamptz,
  used_by     uuid references auth.users (id)
);

-- ---------------------------------------------------------------------
-- Oppskrifter
-- ---------------------------------------------------------------------

create table public.recipes (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
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
create index recipes_family_idx on public.recipes (family_id) where deleted_at is null;

create table public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
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

create table public.steps (
  id                uuid primary key default gen_random_uuid(),
  recipe_id         uuid not null references public.recipes (id) on delete cascade,
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
create table public.step_inputs (
  step_id        uuid not null references public.steps (id) on delete cascade,
  position       integer not null,
  ingredient_id  uuid references public.ingredients (id) on delete cascade,
  input_step_id  uuid references public.steps (id) on delete cascade,
  primary key (step_id, position),
  check ((ingredient_id is null) <> (input_step_id is null)),
  check (input_step_id is distinct from step_id)
);

-- Et steg kan bare bruke ingredienser fra samme oppskrift og resultatet av TIDLIGERE steg.
create function public.check_step_input() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_recipe uuid;
  v_pos    integer;
begin
  select recipe_id, position into v_recipe, v_pos from public.steps where id = new.step_id;
  if new.ingredient_id is not null and not exists (
    select 1 from public.ingredients where id = new.ingredient_id and recipe_id = v_recipe
  ) then
    raise exception 'Ingrediensen tilhører en annen oppskrift';
  end if;
  if new.input_step_id is not null and not exists (
    select 1 from public.steps where id = new.input_step_id and recipe_id = v_recipe and position < v_pos
  ) then
    raise exception 'Et steg kan bare bygge på tidligere steg i samme oppskrift';
  end if;
  return new;
end $$;

create constraint trigger step_inputs_valid
  after insert or update on public.step_inputs
  deferrable initially deferred
  for each row execute function public.check_step_input();

create type public.attachment_kind as enum ('photo', 'original-scan');

create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  kind          public.attachment_kind not null,
  storage_path  text not null,
  caption       text,
  created_by    uuid not null default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now()
);

create table public.favorites (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- Versjonshistorikk: et fullt øyeblikksbilde (oppskrift + ingredienser + steg + koblinger)
-- per lagring. Gjenoppretting = lagre et gammelt øyeblikksbilde som ny versjon.
create table public.recipe_versions (
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  version    integer not null,
  saved_by   uuid not null default auth.uid() references auth.users (id),
  saved_at   timestamptz not null default now(),
  snapshot   jsonb not null,
  primary key (recipe_id, version)
);

-- ---------------------------------------------------------------------
-- Hjelpefunksjoner for tilgang (security definer: unngår rekursjon i RLS)
-- ---------------------------------------------------------------------

create function public.is_family_member(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family and user_id = (select auth.uid())
  )
$$;

create function public.has_family_role(p_family uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family and user_id = (select auth.uid()) and role = any (p_roles)
  )
$$;

create function public.can_access_recipe(p_recipe uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.recipes r
    join public.family_members m on m.family_id = r.family_id
    where r.id = p_recipe and m.user_id = (select auth.uid())
  )
$$;

create function public.can_access_step(p_step uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_access_recipe((select recipe_id from public.steps where id = p_step))
$$;

-- Den som oppretter en familie blir eier automatisk.
create function public.add_family_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.family_members (family_id, user_id, role, display_name)
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

create trigger families_add_owner
  after insert on public.families
  for each row execute function public.add_family_owner();

-- Lager en invitasjon og returnerer tokenet (vises bare denne ene gangen).
create function public.create_family_invite(p_family uuid, p_role public.member_role default 'member')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'base64');
begin
  if not public.has_family_role(p_family, array['owner', 'admin']::public.member_role[]) then
    raise exception 'Bare eier eller administrator kan invitere';
  end if;
  if p_role = 'owner' then
    raise exception 'Kan ikke invitere nye eiere';
  end if;
  v_token := translate(v_token, '+/=', '-_');
  insert into public.family_invites (family_id, token_hash, role)
  values (p_family, encode(extensions.digest(v_token, 'sha256'), 'hex'), p_role);
  return v_token;
end $$;

-- Tar imot en invitasjon. Engangs, med utløpstid.
create function public.accept_family_invite(p_token text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.family_invites;
begin
  if (select auth.uid()) is null then
    raise exception 'Du må være logget inn';
  end if;

  select * into v_invite
  from public.family_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found or v_invite.used_at is not null or v_invite.expires_at < now() then
    raise exception 'Invitasjonen er ugyldig eller utløpt';
  end if;

  insert into public.family_members (family_id, user_id, role, display_name)
  values (v_invite.family_id, (select auth.uid()), v_invite.role, p_display_name)
  on conflict (family_id, user_id) do nothing;

  update public.family_invites
  set used_at = now(), used_by = (select auth.uid())
  where id = v_invite.id;

  return v_invite.family_id;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.families        enable row level security;
alter table public.family_members  enable row level security;
alter table public.family_invites  enable row level security;
alter table public.recipes         enable row level security;
alter table public.ingredients     enable row level security;
alter table public.steps           enable row level security;
alter table public.step_inputs     enable row level security;
alter table public.attachments     enable row level security;
alter table public.favorites       enable row level security;
alter table public.recipe_versions enable row level security;

-- families
create policy "medlemmer ser familien" on public.families
  for select to authenticated using (public.is_family_member(id) or created_by = (select auth.uid()));
create policy "innlogget kan opprette familie" on public.families
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "eier/admin endrer familien" on public.families
  for update to authenticated using (public.has_family_role(id, array['owner', 'admin']::public.member_role[]));
create policy "eier sletter familien" on public.families
  for delete to authenticated using (public.has_family_role(id, array['owner']::public.member_role[]));

-- family_members (nye medlemmer kommer inn via accept_family_invite)
create policy "medlemmer ser hverandre" on public.family_members
  for select to authenticated using (public.is_family_member(family_id));
create policy "endre eget navn, eller admin endrer" on public.family_members
  for update to authenticated
  using (user_id = (select auth.uid()) or public.has_family_role(family_id, array['owner', 'admin']::public.member_role[]))
  with check (
    -- vanlige medlemmer kan ikke gi seg selv en ny rolle
    public.has_family_role(family_id, array['owner', 'admin']::public.member_role[])
    or role = (select m.role from public.family_members m where m.family_id = family_members.family_id and m.user_id = (select auth.uid()))
  );
create policy "forlate familien, eller admin fjerner" on public.family_members
  for delete to authenticated
  using ((user_id = (select auth.uid()) and role <> 'owner') or public.has_family_role(family_id, array['owner', 'admin']::public.member_role[]));

-- family_invites (opprettes via create_family_invite)
create policy "admin ser invitasjoner" on public.family_invites
  for select to authenticated using (public.has_family_role(family_id, array['owner', 'admin']::public.member_role[]));
create policy "admin trekker tilbake invitasjoner" on public.family_invites
  for delete to authenticated using (public.has_family_role(family_id, array['owner', 'admin']::public.member_role[]));

-- recipes
create policy "familien ser oppskrifter" on public.recipes
  for select to authenticated using (public.is_family_member(family_id));
create policy "familien legger til oppskrifter" on public.recipes
  for insert to authenticated with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "familien redigerer oppskrifter" on public.recipes
  for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy "forfatter eller admin sletter" on public.recipes
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.has_family_role(family_id, array['owner', 'admin']::public.member_role[]));

-- ingredienser, steg, koblinger, vedlegg, versjoner: følger oppskriften
create policy "via oppskrift" on public.ingredients
  for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));
create policy "via oppskrift" on public.steps
  for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));
create policy "via steg" on public.step_inputs
  for all to authenticated using (public.can_access_step(step_id)) with check (public.can_access_step(step_id));
create policy "via oppskrift" on public.attachments
  for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));
create policy "se versjoner" on public.recipe_versions
  for select to authenticated using (public.can_access_recipe(recipe_id));
create policy "lagre versjoner" on public.recipe_versions
  for insert to authenticated with check (public.can_access_recipe(recipe_id) and saved_by = (select auth.uid()));

-- favoritter: egne, og bare for oppskrifter man har tilgang til
create policy "egne favoritter" on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_access_recipe(recipe_id));

-- Funksjonene skal ikke kunne kalles anonymt
revoke execute on all functions in schema public from anon, public;
grant execute on function public.create_family_invite(uuid, public.member_role) to authenticated;
grant execute on function public.accept_family_invite(text, text) to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.has_family_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.can_access_recipe(uuid) to authenticated;
grant execute on function public.can_access_step(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Lagring av bilder: privat bøtte, mappe per familie: <family_id>/<fil>
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('recipe-media', 'recipe-media', false)
on conflict (id) do nothing;

create policy "familien leser bilder" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-media' and public.is_family_member(((storage.foldername(name))[1])::uuid));
create policy "familien laster opp bilder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-media' and public.is_family_member(((storage.foldername(name))[1])::uuid));
create policy "familien sletter bilder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-media' and public.is_family_member(((storage.foldername(name))[1])::uuid));
