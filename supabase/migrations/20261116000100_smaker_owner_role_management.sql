-- =====================================================================
-- Sikker rolleadministrasjon
--
-- Bare eiere kan endre medlemsroller, og bare gjennom én kontrollert RPC.
-- Direkte UPDATE av role sperres også for eiere, slik at reglene ikke kan
-- omgås utenfor appen. Administratorer kan fortsatt invitere og administrere
-- vanlige medlemmer, men aldri endre eller fjerne eiere.
-- =====================================================================

-- Fjern bred tabellrettighet og gi bare tilgang til redigerbare profilfelt.
-- Rolleendringer gjøres av SECURITY DEFINER-funksjonen nedenfor.
revoke update on table public.smaker_family_members from authenticated;
grant update (display_name, color) on table public.smaker_family_members to authenticated;

drop policy if exists "endre eget navn, eller admin endrer" on public.smaker_family_members;
create policy "endre egen profil, eller admin endrer profil" on public.smaker_family_members
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or smaker_private.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[])
  )
  with check (
    user_id = (select auth.uid())
    or smaker_private.smaker_has_family_role(family_id, array['owner', 'admin']::public.smaker_member_role[])
  );

-- Medlemmer og administratorer kan forlate selv. Eiere kan fjerne
-- administratorer/medlemmer, mens administratorer bare kan fjerne medlemmer.
-- Ingen autentisert bruker kan slette en eier direkte.
drop policy if exists "forlate familien, eller admin fjerner" on public.smaker_family_members;
create policy "forlate familien eller fjerne underordnet medlem" on public.smaker_family_members
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or (
      role <> 'owner'
      and smaker_private.smaker_has_family_role(family_id, array['owner']::public.smaker_member_role[])
    )
    or (
      role = 'member'
      and smaker_private.smaker_has_family_role(family_id, array['admin']::public.smaker_member_role[])
    )
  );

create function public.smaker_set_member_role(
  p_family uuid,
  p_user uuid,
  p_role public.smaker_member_role
) returns public.smaker_member_role
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.smaker_member_role;
  v_owner_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Du må være logget inn';
  end if;

  if not smaker_private.smaker_has_family_role(
    p_family,
    array['owner']::public.smaker_member_role[]
  ) then
    raise exception 'Bare en eier kan endre roller';
  end if;

  if p_user = (select auth.uid()) then
    raise exception 'Du kan ikke endre din egen rolle';
  end if;

  select role into v_current
  from public.smaker_family_members
  where family_id = p_family and user_id = p_user
  for update;

  if not found then
    raise exception 'Brukeren er ikke medlem av familien';
  end if;

  if v_current = 'owner' and p_role <> 'owner' then
    select count(*) into v_owner_count
    from public.smaker_family_members
    where family_id = p_family and role = 'owner';

    if v_owner_count <= 1 then
      raise exception 'Familien må ha minst én eier';
    end if;
  end if;

  update public.smaker_family_members
  set role = p_role
  where family_id = p_family and user_id = p_user;

  return p_role;
end $$;

revoke execute on function public.smaker_set_member_role(uuid, uuid, public.smaker_member_role) from public, anon;
grant execute on function public.smaker_set_member_role(uuid, uuid, public.smaker_member_role) to authenticated;

-- Rolle- og profilendringer skal dukke opp hos alle i familien med en gang.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'smaker_family_members'
     ) then
    alter publication supabase_realtime add table public.smaker_family_members;
  end if;
end $$;

-- Invitasjonsfunksjonen kan også motta en rolle direkte via API-et. Behold
-- administratorers rett til å invitere vanlige medlemmer, men krev eierrolle
-- hvis invitasjonen skal gi administratorrettigheter.
create or replace function public.smaker_create_family_invite(
  p_family uuid,
  p_role public.smaker_member_role default 'member'
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  v_try integer;
  v_pos integer;
begin
  if not smaker_private.smaker_has_family_role(p_family, array['owner', 'admin']::public.smaker_member_role[]) then
    raise exception 'Bare eier eller administrator kan invitere';
  end if;
  if p_role = 'owner' then
    raise exception 'Kan ikke invitere nye eiere';
  end if;
  if p_role = 'admin' and not smaker_private.smaker_has_family_role(
    p_family,
    array['owner']::public.smaker_member_role[]
  ) then
    raise exception 'Bare en eier kan invitere en administrator';
  end if;

  for v_try in 1..5 loop
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for v_pos in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_pos) % 32) + 1, 1);
    end loop;

    begin
      insert into public.smaker_family_invites (family_id, token_hash, role, expires_at)
      values (p_family, encode(extensions.digest(v_code, 'sha256'), 'hex'), p_role, now() + interval '1 hour');
      return v_code;
    exception when unique_violation then
      -- Prøv igjen ved en svært usannsynlig kodekollisjon.
    end;
  end loop;

  raise exception 'Klarte ikke å lage en unik invitasjonskode';
end $$;
