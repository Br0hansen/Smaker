---
title: "Grunnstruktur og design for Smaker"
tags: [session-log, smaker]
created: 2026-11-15
updated: 2026-11-15
status: completed
type: log
---

## Hva ble gjort
- Installert Graphify (prosjektvis) og minneoppsett i repoet. Oppstartsskript i cloud-miljøet installerer Graphify og npm-pakker.
- Vurdert taste-skill: ikke installert (laget for markedsføringsnettsider, ikke apper).
- Satt opp Vite + React 19 + TypeScript + Tailwind v4 + Ionic 9 + vite-plugin-pwa.
- Domenelag: datamodell, mengdetolking, [[recipe-grid]]-algoritme, automatisk kobling, teksttolking, validering.
- Alle hovedskjermer, mobil først. Supabase-skjema med RLS ([[datamodell]]).

## Beslutninger
Se [[decisions]]: minne i repoet, Graphify prosjektvis, Ionic for skall + Tailwind for innhold.

## Gjenstår
- [ ] Koble på Supabase (auth, `save_recipe`-RPC, sanntid)
- [ ] Tekstgjenkjenning for bilder
- [ ] Offline-kø for endringer
- [ ] Kodesplitting (hovedbundel 1,5 MB / 346 kB gzip, mest Ionic)
- [ ] Vurdere `graphifyy[sql]` i oppstartsskriptet så SQL kommer med i grafen

## Tilstand for gjenopptak
- Branch: `claude/tender-fermi-u1x102`
- Tester: `npm test` 13/13, `npm run test:db` 23/23, `npm run build` OK
- Neste handling: velg Supabase-prosjekt og implementer `save_recipe`-RPC + bytte `src/data/store.ts` til Supabase.

## Endrede filer
- `src/` – hele appen
- `supabase/migrations/20261115000000_init.sql`, `supabase/tests/rls.test.mjs`
- `public/` – ikoner
- `README.md`, `CLAUDE.md`, `memory/`

## Notater opprettet eller oppdatert
- [[recipe-grid]], [[datamodell]], [[decisions]], [[CLAUDE]]

## Tillegg: Supabase
- Opprettet Smaker-tabellene i DailyPep (migrasjonene `smaker_init` og `smaker_private_helpers`). Alt prefikset `smaker_`; hjelpefunksjoner i `smaker_private`.
- Sikkerhetsrådgiveren: bare de to tilsiktede RPC-ene står igjen for Smaker.
- Neste: `@supabase/supabase-js`, innlogging, og bytte `src/data/store.ts` til Supabase.

## Tillegg: Supabase-tilkobling
- Migrasjon `smaker_app_api` (create_family, get/save/delete recipe, familiefavoritter, sanntid) kjørt i DailyPep, røyktestet med tilbakerulling.
- Klient: `src/lib/supabase.ts`, `src/data/remote.ts`, ny `store.ts` (remote + lokal demomodus), AuthPage (lenke + kode), OnboardingPage, tom tilstand med eksempelimport.
- Tester: `npm test` 13/13, `npm run test:db` 40/40, etterlignet innloggingsflyt i Playwright OK.

## Gjenstår (oppdatert)
- [ ] Brukeren: Redirect URLs, `{{ .Token }}` i Magic Link-malen, egen SMTP (se README)
- [ ] Offline-kø for endringer
- [ ] Bytte mellom flere familier i UI
- [ ] Tekstgjenkjenning for bilder
- [ ] Kodesplitting
