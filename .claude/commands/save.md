# /save — Lagre økten og konsolider minnet

Tilpasset fra lucasrosati/claude-code-memory-setup for cloud-økter: vaultet ligger i repoet (`memory/`), og alt må committes og pushes, ellers forsvinner det når maskinen slettes.

Kjør fasene i rekkefølge. Fase 2 skriver bare når det finnes varig kunnskap. Er du i tvil, ikke skriv: øktloggen bevarer konteksten.

## Finn vaultet
```bash
root=$(git rev-parse --show-toplevel); vault="$root/memory"; echo "vault=$vault branch=$(git branch --show-current)"
```

## Fase 1: Øktlogg (alltid)
1. Les `<vault>/CLAUDE.md` først. Gå gjennom hele økten.
2. Lag `<vault>/logs/YYYY-MM-DD-kort-beskrivelse.md` (kebab-case, uten æøå). Overskriv aldri: finnes navnet, legg til `HHMM` etter datoen. Frontmatter:
```yaml
---
title: "Beskrivende tittel"
tags: [session-log, smaker]
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: completed
type: log
---
```
3. Seksjoner: `## Hva ble gjort`, `## Beslutninger` (ellers «Ingen nye beslutninger.»), `## Gjenstår` (som `- [ ]`), `## Tilstand for gjenopptak` (oppgave, branch, tester kjørt og resultat, blokkeringer, neste konkrete handling), `## Endrede filer` (`sti` — hva), `## Notater opprettet eller oppdatert`.
4. Minst 2 wikilinks, komplett frontmatter. Aldri hele samtalen ordrett.

## Fase 2: Konsolider minnet (betinget)
### 2.1 Kandidater – minst ett kriterium
- Teknisk/arkitektonisk beslutning med begrunnelse (alternativer ble vurdert)
- Gjenbrukbar innsikt: mønster, felle, ikke-åpenbar feilårsak, oppførsel i et verktøy/bibliotek
- Prosjektkonvensjon opprettet eller endret
- Varig prosjektfakta: skjema, struktur, sti, kjent feil med årsak
- Rettelse av noe som allerede er lagret og viste seg feil

Ikke kandidater: fremdrift, ferdige oppgaver, uavsluttede undersøkelser, detaljer som ikke generaliserer, ting som allerede er lagret uendret. Ingen kandidater → hopp til 2.5.

### 2.2 Sjekk duplikater
`grep -ril "<nøkkelord>" <vault>/permanent/ <vault>/features/ <vault>/data/ <vault>/architecture/ <vault>/CLAUDE.md ./CLAUDE.md`. Finnes et tilsvarende notat: oppdater det (innhold og `updated`). Motsier økten det: oppdater og skriv «Oppdatert YYYY-MM-DD: …» i notatet. Aldri duplikater.

### 2.3 Skriv etter mål
- **Beslutning:** legg til nederst i `<vault>/architecture/decisions.md`: `## YYYY-MM-DD — kort tittel` med Kontekst, Alternativer, Beslutning, Begrunnelse som punkter.
- **Gjenbrukbar innsikt:** `<vault>/permanent/<kebab-case>.md` med komplett frontmatter (`type: concept`), ett konsept, minst 2 wikilinks til eksisterende notater (list `permanent/` først). Legg en peker `- [[notat]]: én linje` under `## Permanent facts` i `<vault>/CLAUDE.md` (ikke dupliser).
- **Prosjektfakta:** oppdater passende notat i `data/`, `architecture/` eller `features/`, ellers én linje under `## Permanent facts`. Aldri hemmeligheter.
- **Konvensjon:** FORESLÅ linjen til `## Konvensjoner` i rot-`CLAUDE.md` og spør (j/n) før du skriver. Spør etter de andre skrivingene og rapporten, og noter forslaget under `## Gjenstår` i loggen.

Blir `<vault>/CLAUDE.md` over 300 linjer: flytt eldste seksjoner til `<vault>/architecture/claude-archive.md` og lenk til [[claude-archive]].

### 2.4 Lenk
List alle notater opprettet/oppdatert under «Notater opprettet eller oppdatert» i øktloggen, som wikilinks.

### 2.5 Commit og push (påkrevd i cloud)
Commit bare filene under `memory/` (og rot-`CLAUDE.md` hvis en godkjent konvensjon ble lagt til):
```bash
git add memory/ && git commit -m "docs(memory): <kort beskrivelse>" && git push -u origin "$(git branch --show-current)"
```
Push bare til branchen økten er satt til å jobbe på. Ved nettverksfeil: prøv igjen opptil 4 ganger med økende pause.

### 2.6 Rapport
```
Øktlogg: <sti>
Minne:
- opprettet: <sti> (grunn)
- oppdatert: <sti> (grunn)
Pushet: <branch> @ <kort hash>
```
eller `Minne: ingenting å konsolidere denne økten`.
