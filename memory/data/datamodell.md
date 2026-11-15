---
title: Datamodell
tags: [smaker, data, supabase]
created: 2026-11-15
updated: 2026-11-15
status: active
type: permanent
---

# Datamodell

> **Delt prosjekt:** DailyPep deles med andre apper (`dailypep_*`, `ting_*`, `things_*`). Alt for Smaker har prefikset `smaker_` – tabeller, typer, funksjoner og bøtta `smaker-media`. Interne hjelpefunksjoner ligger i skjemaet `smaker_private` (ikke synlig i API-et). Bruk aldri «on all functions/tables in schema public» – det treffer de andre appene.

Oppskrift = graf. TypeScript i `src/domain/types.ts`, Postgres i `supabase/migrations/` (kjørt i Supabase-prosjektet **DailyPep**, `tgqcyfviukurtovtxphy`). Brukes av [[recipe-grid]]; beslutninger i [[decisions]].

- `smaker_ingredients` – kilder. `amount` null = ukjent/etter smak (vi gjetter aldri).
- `smaker_steps` – `action` (kort, for rutenettet), `text` (full), `produces` (mellomprodukt), tid/temperatur valgfritt.
- `smaker_step_inputs` – kant: ingrediens ELLER tidligere steg. Trigger håndhever «bare tidligere steg i samme oppskrift».
- `smaker_recipe_versions` – fullt JSON-øyeblikksbilde per lagring. Gjenoppretting lagrer gammelt bilde som ny versjon.
- Tilgang: RLS via `smaker_private.smaker_is_family_member`, `…_has_family_role`, `…_can_access_recipe` (security definer). Nye medlemmer kun via RPC `smaker_accept_family_invite` (engangstoken, bare hash lagres, 7 dagers utløp).
- Storage: privat bøtte `smaker-media`, mappe per familie (`<family_id>/…`).
- Test: `npm run test:db` (PGlite + Supabase-etterligning, 25 sjekker).

## App-API (migrasjon `smaker_app_api`)
- `smaker_save_recipe(jsonb)` erstatter ingredienser/steg/koblinger/vedlegg i sin helhet og lagrer øyeblikksbilde. JSON-formen er lik TypeScript-typen `Recipe` (camelCase) – se `smaker_recipe_json`.
- Konfliktsjekk: klienten sender versjonen den redigerte; utdatert → `SMAKER_CONFLICT` → `ConflictError` i klienten.
- Bilder: databasen lagrer sti (`<familie>/<uuid>.jpg`), klienten viser signert URL (7 dager). `remote.ts` husker sti ↔ URL.
- Favoritter: hele familien kan se, bare egne kan endres.
- Røyktest mot ekte database: `DO`-blokk som avslutter med `raise exception` → alt rulles tilbake, resultatet står i feilmeldingen.
