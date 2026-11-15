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
