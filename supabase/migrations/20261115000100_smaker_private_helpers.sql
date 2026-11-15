-- =====================================================================
-- Smaker – flytt interne hjelpefunksjoner ut av API-et, og legg til indekser.
--
-- Tilgangssjekkene (brukt i RLS) og triggerfunksjonene trenger ikke å kunne
-- kalles som /rest/v1/rpc/... Eget skjema, så vi ikke rører det delte
-- "private"-skjemaet til de andre appene i prosjektet.
-- RLS-reglene peker på funksjonene via OID, så de følger med flyttingen.
-- =====================================================================

create schema if not exists smaker_private;
revoke all on schema smaker_private from public, anon;
grant usage on schema smaker_private to authenticated;

alter function public.smaker_is_family_member(uuid) set schema smaker_private;
alter function public.smaker_has_family_role(uuid, public.smaker_member_role[]) set schema smaker_private;
alter function public.smaker_can_access_recipe(uuid) set schema smaker_private;
alter function public.smaker_can_access_step(uuid) set schema smaker_private;
alter function public.smaker_can_access_folder(text) set schema smaker_private;
alter function public.smaker_add_family_owner() set schema smaker_private;
alter function public.smaker_check_step_input() set schema smaker_private;

-- Funksjonskropper med skjemanavn i teksten må oppdateres
create or replace function smaker_private.smaker_can_access_step(p_step uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select smaker_private.smaker_can_access_recipe((select recipe_id from public.smaker_steps where id = p_step))
$$;

create or replace function public.smaker_create_family_invite(p_family uuid, p_role public.smaker_member_role default 'member')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'base64');
begin
  if not smaker_private.smaker_has_family_role(p_family, array['owner', 'admin']::public.smaker_member_role[]) then
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

-- Triggerfunksjoner skal aldri kalles direkte
revoke execute on function smaker_private.smaker_add_family_owner() from public, anon, authenticated;
revoke execute on function smaker_private.smaker_check_step_input() from public, anon, authenticated;

-- Indekser for fremmednøkler som brukes i oppslag og sletting
create index if not exists smaker_family_invites_family_idx on public.smaker_family_invites (family_id);
create index if not exists smaker_attachments_recipe_idx on public.smaker_attachments (recipe_id);
create index if not exists smaker_favorites_recipe_idx on public.smaker_favorites (recipe_id);
create index if not exists smaker_step_inputs_ingredient_idx on public.smaker_step_inputs (ingredient_id) where ingredient_id is not null;
create index if not exists smaker_step_inputs_input_step_idx on public.smaker_step_inputs (input_step_id) where input_step_id is not null;
create index if not exists smaker_recipes_created_by_idx on public.smaker_recipes (created_by);
