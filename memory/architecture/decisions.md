---
title: Beslutninger
tags: [smaker, beslutninger]
created: 2026-11-15
updated: 2026-11-15
status: active
type: decision
---

# Beslutninger

Nyeste nederst. Hver beslutning: Kontekst, Alternativer, Beslutning, Begrunnelse. Se også [[CLAUDE]].

## 2026-11-15 — Minne i repoet i stedet for ~/vault
- **Kontekst:** claude-code-memory-setup antar et Obsidian-vault i `~/vault` på egen maskin. Øktene kjører i cloud-maskiner som slettes.
- **Alternativer:** `~/vault` i maskinen (forsvinner), vente til lokal maskin, vault i repoet.
- **Beslutning:** Vault i `memory/` i repoet, kommandoer i `.claude/commands/`. `/save` committer og pusher.
- **Begrunnelse:** Bare committet innhold overlever mellom øktene. SessionEnd-autolagringen er utelatt fordi den kjører etter økten og aldri blir committet.

## 2026-11-15 — Graphify installert prosjektvis
- **Kontekst:** Ønske om kunnskapsgraf over kodebasen.
- **Alternativer:** Global installasjon (forsvinner med maskinen), prosjektvis.
- **Beslutning:** `graphify install --project --platform claude` (skill + hooks i `.claude/`). CLI-et installeres av miljøets oppstartsskript (`uv tool install graphifyy`).
- **Begrunnelse:** Skill og hooks følger repoet; CLI-et må installeres på nytt i hver ny maskin.

## 2026-11-15 — Ionic React for appskallet, Tailwind for innholdet
- **Kontekst:** Brukeren ønsker Ionic. Appen skal føles som en ekte mobilapp og være enkel for besteforeldre.
- **Alternativer:** Ren Tailwind med egne komponenter; Ionic for alt; Ionic for skall + Tailwind for innhold.
- **Beslutning:** Ionic 9 (`@ionic/react`, `@ionic/react-router`) for faner, navigasjon, bunnark, søk og segmenter. Tailwind v4 for kort, Recipe Grid og matlagingsmodus. Ionic temes med egne farger/fonter via CSS-variabler, `mode: 'ios'` overalt for likt utseende.
- **Begrunnelse:** Native gester og overganger gratis, uten at det egne designet (særlig Recipe Grid) må presses inn i ferdige komponenter.
- **Følge:** `@ionic/react-router` 9 krever React Router 6 (`>=6.4 <7`), så vi bruker 6.x – ikke 7.

## 2026-11-15 — Smaker-tabellene i det delte DailyPep-prosjektet
- **Kontekst:** Brukeren ba om at lagringen skal ligge i Supabase-prosjektet DailyPep, som allerede brukes av andre apper (dailypep_, ting_, things_ i `public`).
- **Alternativer:** Eget skjema `smaker` (krever at skjemaet eksponeres i API-innstillingene), generiske navn i `public` (kollisjonsfare), prefiks `smaker_` i `public`.
- **Beslutning:** Prefiks `smaker_` på alle objekter i `public`, som de andre appene. Interne hjelpefunksjoner i eget skjema `smaker_private`. Bøtte `smaker-media`.
- **Begrunnelse:** Følger prosjektets konvensjon, virker med standard API-oppsett, og kan ikke kollidere med de andre appene. Brede `revoke … on all functions in schema public` ble fjernet fra migrasjonen fordi det ville ødelagt de andre appenes RPC-er. Lagringsreglene sammenligner mappenavn som tekst, så filer i andre apper sine bøtter ikke kan få reglene til å feile.
