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
- Ionic sine komponentstiler (shadow/scoped, ulagdelt) overstyrer Tailwind-utilities som `md:hidden` på `Ion*`-elementer – skjul dem i koden (`useMediaQuery`) i stedet
- Ionic CSS importeres i `@layer ionic` under Tailwind-utilities, ellers vinner Ionic sin typography.css over klassene våre
- `@ionic/react-router` 9 krever React Router 6 (ikke 7)
- Playwright i cloud-maskinen: bruk `require('playwright')` (CommonJS); ESM-import finner den ikke
- Lokal Postgres kan ikke kjøre som root her – bruk PGlite for databasetester
