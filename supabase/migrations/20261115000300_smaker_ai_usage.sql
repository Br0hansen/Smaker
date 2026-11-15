-- =====================================================================
-- Smaker – logg over bildelesing (Claude), for døgngrense og kostnadsoversikt.
-- Skrives bare av Edge Function-en (service role). Brukere kan se sin egen bruk.
-- =====================================================================

create table public.smaker_ai_usage (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  family_id      uuid references public.smaker_families (id) on delete set null,
  kind           text not null default 'read-recipe',
  model          text not null,
  images         integer not null default 1,
  input_tokens   integer,
  output_tokens  integer,
  ok             boolean not null default true,
  error          text,
  created_at     timestamptz not null default now()
);
create index smaker_ai_usage_user_time_idx on public.smaker_ai_usage (user_id, created_at desc);

alter table public.smaker_ai_usage enable row level security;
create policy "se egen bruk" on public.smaker_ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.smaker_ai_usage from anon;
revoke insert, update, delete on table public.smaker_ai_usage from authenticated;
