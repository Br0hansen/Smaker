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
