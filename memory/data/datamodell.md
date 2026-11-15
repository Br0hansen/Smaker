---
title: Datamodell
tags: [smaker, data, supabase]
created: 2026-11-15
updated: 2026-11-15
status: active
type: permanent
---

# Datamodell

Oppskrift = graf. TypeScript i `src/domain/types.ts`, Postgres i `supabase/migrations/20261115000000_init.sql`. Brukes av [[recipe-grid]]; beslutninger i [[decisions]].

- `ingredients` – kilder. `amount` null = ukjent/etter smak (vi gjetter aldri).
- `steps` – `action` (kort, for rutenettet), `text` (full), `produces` (mellomprodukt), tid/temperatur valgfritt.
- `step_inputs` – kant: ingrediens ELLER tidligere steg. Trigger håndhever «bare tidligere steg i samme oppskrift».
- `recipe_versions` – fullt JSON-øyeblikksbilde per lagring. Gjenoppretting lagrer gammelt bilde som ny versjon.
- Tilgang: RLS via `is_family_member`, `has_family_role`, `can_access_recipe` (security definer). Nye medlemmer kun via `accept_family_invite` (engangstoken, bare hash lagres, 7 dagers utløp).
- Storage: privat bøtte `recipe-media`, mappe per familie (`<family_id>/…`).
- Test: `npm run test:db` (PGlite + Supabase-etterligning, 23 sjekker).
