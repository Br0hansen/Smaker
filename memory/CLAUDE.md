---
title: Smaker – minne
tags: [smaker, minne]
created: 2026-11-15
updated: 2026-11-15
status: active
type: index
---

# Smaker – prosjektminne

Dette er prosjektets varige minne. Mappen kan åpnes som et Obsidian-vault.
Den ligger i repoet fordi Claude-øktene kjører i cloud-maskiner som slettes etterpå –
bare det som committes overlever. Se [[decisions]] for beslutninger.

## Stack
React + TypeScript, Tailwind CSS v4, Vite, vite-plugin-pwa. Supabase (database, auth, storage, RLS) planlagt.

## Struktur
- `permanent/` – ett gjenbrukbart konsept per notat
- `logs/` – øktlogger fra `/save`
- `architecture/` – `decisions.md` og arkitekturnotater
- `features/` – notater per funksjon (Recipe Grid, innlegging, matlagingsmodus …)
- `data/` – datamodell og skjema
- `templates/` – notatmal

## Regler for notater
- Wikilinks `[[notat-navn]]`, ikke markdown-lenker, mellom notater
- YAML-frontmatter på alle notater (se `templates/note.md`)
- Filnavn i kebab-case uten æøå: `recipe-grid.md`
- Ett konsept per permanent notat, minst 2 wikilinks per notat
- Skriv notatene på norsk
- Aldri hemmeligheter (nøkler, passord) – bare navnet på konfigurasjonen

## Aldri
- Slett notater uten å spørre
- Lag notater uten frontmatter
- Endre mappestrukturen uten å dokumentere det her

## Kommandoer
`/resume`, `/save`, `/memorize`, `/commit` – se `.claude/commands/`.

## Permanent facts
- [[recipe-grid]]: rutenettet beregnes fra grafen, algoritmen og visningsregler
- [[datamodell]]: oppskrift som graf, Postgres-skjema og RLS
- Publisering: GitHub Pages, https://br0hansen.github.io/Smaker/ – workflow `.github/workflows/deploy.yml` kjører på push til `main`. Base-sti via `VITE_BASE`; `import.meta.env.BASE_URL` brukes i ruter-basename, invitasjonslenker og magisk lenke. `404.html` = `index.html` for direkte lenker
- Supabase: prosjekt DailyPep (`tgqcyfviukurtovtxphy`, eu-central-1), DELT med andre apper – alt vårt har prefiks `smaker_`
- Ionic sine komponentstiler (shadow/scoped, ulagdelt) overstyrer Tailwind-utilities som `md:hidden` på `Ion*`-elementer – skjul dem i koden (`useMediaQuery`) i stedet
- Ionic CSS importeres i `@layer ionic` under Tailwind-utilities, ellers vinner Ionic sin typography.css over klassene våre
- `@ionic/react-router` 9 krever React Router 6 (ikke 7)
- Navigasjon: Hjem og Familien er Ionic-faner (`IonTabs` i `src/components/MainTabs.tsx`, containerrute `/*` sist i ytre outlet). Oppskrift/innlegging/matlaging ligger utenfor fanene. Bruk aldri `router.push(path, 'none', 'replace')` for fanebytte – det ga låste knapper på telefon. Toppmenyen på PC bytter fane med `NavContext.changeTab`
- Appfølelse/scroll lock: `html` og `ion-content::part(scroll)` har `overscroll-behavior: none`; knapper/menyer har `user-select: none`. Klypezoom er bevisst IKKE slått av (lesbarhet for besteforeldre) – dobbelttrykk-zoom er av via Ionic (`touch-action: manipulation`)
- `IonTabBar` dropper alle barn som ikke er `IonTabButton`; «Legg til» ligger derfor i `slot="bottom"` i `IonTabs`, absolutt plassert over midten
- Sjekk exit-koden til `npm test`, ikke bare «Tests N passed» – en fil Vitest ikke forstår gir «Failed Suites» mens alle tester passerer. Databasesjekken heter derfor `rls-check.mjs` (ikke `*.test.mjs`)
- Playwright i cloud-maskinen: bruk `require('playwright')` (CommonJS); ESM-import finner den ikke
- Lokal Postgres kan ikke kjøre som root her – bruk PGlite for databasetester
- Cloud-maskinen når ikke supabase.co fra nettleseren: test UI-flyt mot Supabase med Playwright `page.route` som etterligner svarene
- `.env` med offentlige Supabase-verdier committes; hemmeligheter i `.env.local`. Demomodus: `VITE_SMAKER_LOCAL=1`
