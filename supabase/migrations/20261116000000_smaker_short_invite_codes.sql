-- =====================================================================
-- Korte familie-invitasjoner og forsøkssperre
--
-- Koder: 6 tegn, engangsbruk, gyldige i én time.
-- Sperre per innlogget bruker:
--   1. gang med 10 feil -> 15 minutters sperre
--   2. gang innen 24 t -> 24 timers karantene
-- En gyldig kode nullstiller telleren.
-- =====================================================================

alter table public.smaker_family_invites
  alter column expires_at set default now() + interval '1 hour';

-- Begrens også invitasjoner som ble laget før denne migrasjonen.
update public.smaker_family_invites
set expires_at = least(expires_at, now() + interval '1 hour')
where used_at is null and expires_at > now() + interval '1 hour';

create table public.smaker_invite_attempt_limits (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  failed_attempts    integer not null default 0 check (failed_attempts between 0 and 10),
  window_started_at  timestamptz not null default now(),
  limited_at         timestamptz,
  blocked_until      timestamptz,
  quarantine_until   timestamptz,
  updated_at         timestamptz not null default now()
);

alter table public.smaker_invite_attempt_limits enable row level security;
revoke all on table public.smaker_invite_attempt_limits from public, anon, authenticated;

-- Seks tegn fra et alfabet uten tegn som lett forveksles: I, O, 0 og 1.
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
      -- Svært usannsynlig kodekollisjon; prøv med nye tilfeldige byte.
    end;
  end loop;

  raise exception 'Klarte ikke å lage en unik invitasjonskode';
end $$;

-- Den gamle funksjonen kaster feil og ville dermed rullet tilbake forsøkstelleren.
-- Tilgang fjernes mens den nye funksjonen opprettes; nederst erstattes den med
-- en kompatibel wrapper som også går gjennom forsøkssperren.
revoke execute on function public.smaker_accept_family_invite(text, text) from authenticated;

create function public.smaker_accept_family_invite_v2(p_code text, p_display_name text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_now timestamptz := now();
  v_code text := replace(replace(upper(trim(p_code)), ' ', ''), '-', '');
  v_limit public.smaker_invite_attempt_limits;
  v_invite public.smaker_family_invites;
  v_failed integer;
  v_retry integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'signed_out');
  end if;

  insert into public.smaker_invite_attempt_limits (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select * into v_limit
  from public.smaker_invite_attempt_limits
  where user_id = v_user
  for update;

  if v_limit.quarantine_until is not null and v_limit.quarantine_until > v_now then
    v_retry := greatest(1, ceil(extract(epoch from (v_limit.quarantine_until - v_now)))::integer);
    return jsonb_build_object('ok', false, 'error', 'quarantine', 'retryAfterSeconds', v_retry);
  end if;

  -- Etter fullført karantene starter brukeren helt på nytt.
  if v_limit.quarantine_until is not null then
    update public.smaker_invite_attempt_limits
    set failed_attempts = 0, window_started_at = v_now, limited_at = null,
        blocked_until = null, quarantine_until = null, updated_at = v_now
    where user_id = v_user;
    v_limit.failed_attempts := 0;
    v_limit.window_started_at := v_now;
    v_limit.limited_at := null;
    v_limit.blocked_until := null;
  end if;

  if v_limit.blocked_until is not null and v_limit.blocked_until > v_now then
    v_retry := greatest(1, ceil(extract(epoch from (v_limit.blocked_until - v_now)))::integer);
    return jsonb_build_object('ok', false, 'error', 'rate_limited', 'retryAfterSeconds', v_retry);
  end if;

  if v_limit.blocked_until is not null or v_limit.window_started_at <= v_now - interval '15 minutes' then
    update public.smaker_invite_attempt_limits
    set failed_attempts = 0, window_started_at = v_now, blocked_until = null, updated_at = v_now
    where user_id = v_user;
    v_limit.failed_attempts := 0;
    v_limit.window_started_at := v_now;
    v_limit.blocked_until := null;
  end if;

  if length(v_code) <= 64 then
    select * into v_invite
    from public.smaker_family_invites
    where token_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
    for update;
  end if;

  if v_invite.id is not null and v_invite.used_at is null and v_invite.expires_at >= v_now then
    insert into public.smaker_family_members (family_id, user_id, role, display_name)
    values (v_invite.family_id, v_user, v_invite.role, p_display_name)
    on conflict (family_id, user_id) do nothing;

    update public.smaker_family_invites
    set used_at = v_now, used_by = v_user
    where id = v_invite.id;

    delete from public.smaker_invite_attempt_limits where user_id = v_user;
    return jsonb_build_object('ok', true, 'familyId', v_invite.family_id);
  end if;

  v_failed := v_limit.failed_attempts + 1;
  if v_failed < 10 then
    update public.smaker_invite_attempt_limits
    set failed_attempts = v_failed, updated_at = v_now
    where user_id = v_user;
    return jsonb_build_object('ok', false, 'error', 'invalid', 'attemptsRemaining', 10 - v_failed);
  end if;

  if v_limit.limited_at is not null and v_limit.limited_at > v_now - interval '24 hours' then
    update public.smaker_invite_attempt_limits
    set failed_attempts = 0, window_started_at = v_now, limited_at = v_now,
        blocked_until = null, quarantine_until = v_now + interval '24 hours', updated_at = v_now
    where user_id = v_user;
    return jsonb_build_object('ok', false, 'error', 'quarantine', 'retryAfterSeconds', 86400);
  end if;

  update public.smaker_invite_attempt_limits
  set failed_attempts = 0, window_started_at = v_now, limited_at = v_now,
      blocked_until = v_now + interval '15 minutes', quarantine_until = null, updated_at = v_now
  where user_id = v_user;
  return jsonb_build_object('ok', false, 'error', 'rate_limited', 'retryAfterSeconds', 900);
end $$;

revoke execute on function public.smaker_accept_family_invite_v2(text, text) from public, anon;
grant execute on function public.smaker_accept_family_invite_v2(text, text) to authenticated;

-- Eldre appversjoner forventer UUID/null fra det gamle funksjonsnavnet. Behold
-- kompatibilitet uten å gi dem en vei rundt den nye forsøkstelleren.
create or replace function public.smaker_accept_family_invite(p_token text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  v_result := public.smaker_accept_family_invite_v2(p_token, p_display_name);
  if coalesce((v_result->>'ok')::boolean, false) then
    return (v_result->>'familyId')::uuid;
  end if;
  return null;
end $$;

revoke execute on function public.smaker_accept_family_invite(text, text) from public, anon;
grant execute on function public.smaker_accept_family_invite(text, text) to authenticated;

