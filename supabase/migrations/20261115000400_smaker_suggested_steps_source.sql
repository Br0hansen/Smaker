-- =====================================================================
-- Smaker – foreslåtte steg og kildelenke
--  smaker_steps.suggested   : steget er foreslått av Claude (originalen manglet det)
--  smaker_recipes.source_url: nettsiden oppskriften ble hentet fra
-- JSON-funksjonene oppdateres så feltene følger med i app-formen.
-- =====================================================================

alter table public.smaker_steps add column suggested boolean not null default false;
alter table public.smaker_recipes add column source_url text check (source_url is null or source_url ~* '^https?://');

create or replace function public.smaker_recipe_json(p_recipe uuid)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id,
    'familyId', r.family_id,
    'title', r.title,
    'description', r.description,
    'story', r.story,
    'origin', r.origin,
    'sourceUrl', r.source_url,
    'servings', r.servings,
    'servingsUnit', r.servings_unit,
    'prepMinutes', r.prep_minutes,
    'totalMinutes', r.total_minutes,
    'categories', to_jsonb(r.categories),
    'coverImage', r.cover_path,
    'createdBy', r.created_by,
    'createdAt', r.created_at,
    'updatedBy', r.updated_by,
    'updatedAt', r.updated_at,
    'version', r.version,
    'ingredients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'name', i.name, 'amount', i.amount, 'amountMax', i.amount_max,
        'unit', i.unit, 'note', i.note, 'group', i.group_name, 'optional', i.optional
      ) order by i.position)
      from public.smaker_ingredients i where i.recipe_id = r.id
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'text', s.text, 'action', s.action, 'produces', s.produces,
        'durationMin', s.duration_min, 'durationMaxMin', s.duration_max_min, 'temperatureC', s.temperature_c,
        'suggested', s.suggested,
        'inputs', coalesce((
          select jsonb_agg(
            case when si.ingredient_id is not null
              then jsonb_build_object('kind', 'ingredient', 'id', si.ingredient_id)
              else jsonb_build_object('kind', 'step', 'id', si.input_step_id)
            end order by si.position)
          from public.smaker_step_inputs si where si.step_id = s.id
        ), '[]'::jsonb)
      ) order by s.position)
      from public.smaker_steps s where s.recipe_id = r.id
    ), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'url', a.storage_path, 'caption', a.caption, 'createdAt', a.created_at
      ) order by a.created_at)
      from public.smaker_attachments a where a.recipe_id = r.id
    ), '[]'::jsonb)
  )
  from public.smaker_recipes r
  where r.id = p_recipe
$$;

create or replace function public.smaker_save_recipe(p_recipe jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_id        uuid := nullif(p_recipe ->> 'id', '')::uuid;
  v_family    uuid := (p_recipe ->> 'familyId')::uuid;
  v_expected  integer := (p_recipe ->> 'version')::integer;
  v_current   integer;
  v_version   integer;
  v_snapshot  jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Du må være logget inn';
  end if;

  if v_id is not null then
    select version into v_current from public.smaker_recipes where id = v_id for update;
  end if;

  if v_current is null then
    insert into public.smaker_recipes (
      id, family_id, title, description, story, origin, source_url, servings, servings_unit,
      prep_minutes, total_minutes, categories, cover_path
    ) values (
      coalesce(v_id, gen_random_uuid()), v_family,
      p_recipe ->> 'title', p_recipe ->> 'description', p_recipe ->> 'story', p_recipe ->> 'origin',
      nullif(p_recipe ->> 'sourceUrl', ''),
      (p_recipe ->> 'servings')::integer, p_recipe ->> 'servingsUnit',
      (p_recipe ->> 'prepMinutes')::integer, (p_recipe ->> 'totalMinutes')::integer,
      coalesce(array(select jsonb_array_elements_text(p_recipe -> 'categories')), '{}'),
      p_recipe ->> 'coverImage'
    ) returning id, version into v_id, v_version;
  else
    if v_expected is not null and v_expected <> v_current then
      raise exception 'SMAKER_CONFLICT' using detail = format('Lagret versjon er %s, du redigerte %s', v_current, v_expected);
    end if;
    v_version := v_current + 1;
    update public.smaker_recipes set
      title = p_recipe ->> 'title',
      description = p_recipe ->> 'description',
      story = p_recipe ->> 'story',
      origin = p_recipe ->> 'origin',
      source_url = nullif(p_recipe ->> 'sourceUrl', ''),
      servings = (p_recipe ->> 'servings')::integer,
      servings_unit = p_recipe ->> 'servingsUnit',
      prep_minutes = (p_recipe ->> 'prepMinutes')::integer,
      total_minutes = (p_recipe ->> 'totalMinutes')::integer,
      categories = coalesce(array(select jsonb_array_elements_text(p_recipe -> 'categories')), '{}'),
      cover_path = p_recipe ->> 'coverImage',
      updated_by = (select auth.uid()),
      updated_at = now(),
      version = v_version
    where id = v_id;
    delete from public.smaker_steps where recipe_id = v_id;
    delete from public.smaker_ingredients where recipe_id = v_id;
    delete from public.smaker_attachments where recipe_id = v_id;
  end if;

  insert into public.smaker_ingredients (id, recipe_id, position, name, amount, amount_max, unit, note, group_name, optional)
  select (e ->> 'id')::uuid, v_id, (o - 1)::integer, e ->> 'name',
         (e ->> 'amount')::numeric, (e ->> 'amountMax')::numeric, e ->> 'unit', e ->> 'note', e ->> 'group',
         coalesce((e ->> 'optional')::boolean, false)
  from jsonb_array_elements(coalesce(p_recipe -> 'ingredients', '[]')) with ordinality as t(e, o);

  insert into public.smaker_steps (id, recipe_id, position, text, action, produces, duration_min, duration_max_min, temperature_c, suggested)
  select (e ->> 'id')::uuid, v_id, (o - 1)::integer, e ->> 'text', coalesce(nullif(e ->> 'action', ''), 'Steg'), e ->> 'produces',
         (e ->> 'durationMin')::integer, (e ->> 'durationMaxMin')::integer, (e ->> 'temperatureC')::integer,
         coalesce((e ->> 'suggested')::boolean, false)
  from jsonb_array_elements(coalesce(p_recipe -> 'steps', '[]')) with ordinality as t(e, o);

  insert into public.smaker_step_inputs (step_id, position, ingredient_id, input_step_id)
  select (s ->> 'id')::uuid, (io - 1)::integer,
         case when i ->> 'kind' = 'ingredient' then (i ->> 'id')::uuid end,
         case when i ->> 'kind' = 'step' then (i ->> 'id')::uuid end
  from jsonb_array_elements(coalesce(p_recipe -> 'steps', '[]')) as st(s),
       jsonb_array_elements(coalesce(s -> 'inputs', '[]')) with ordinality as it(i, io);

  insert into public.smaker_attachments (id, recipe_id, kind, storage_path, caption)
  select coalesce(nullif(e ->> 'id', '')::uuid, gen_random_uuid()), v_id,
         (e ->> 'kind')::public.smaker_attachment_kind, e ->> 'url', e ->> 'caption'
  from jsonb_array_elements(coalesce(p_recipe -> 'attachments', '[]')) as t(e);

  v_snapshot := public.smaker_recipe_json(v_id);
  insert into public.smaker_recipe_versions (recipe_id, version, snapshot)
  values (v_id, v_version, v_snapshot);
  return v_snapshot;
end $$;
