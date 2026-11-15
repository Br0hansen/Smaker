# /commit — Commit + push + lagre økten

## 1. Se på endringene
- Kjør `git status` og `git diff --stat`, og les de endrede filene.

## 2. Lag commit-meldingen
- Format: `type: kort beskrivelse` (f.eks. `feat: recipe grid`, `fix: porsjonsomregning`).
- Ved flere endringer: bruk den viktigste som hovedmelding.

## 3. Bekreft, så utfør
- Vis `git status` og den foreslåtte meldingen, og vent på brukerens bekreftelse.
- Advar om filer som ikke bør committes (`.env`, `node_modules`, `dist` …). Bruk `git add` på konkrete stier, ikke `git add .` blindt.
- `git commit`, deretter `git push -u origin <branch>` – bare til branchen økten er satt til å jobbe på.
- Følg attribusjonslinjene for commits som økten oppgir.

## 4. Lagre økten
Etter push: les `.claude/commands/save.md` og kjør Fase 1 og 2, og legg til i øktloggen:
```markdown
## Commit
- Kort hash, melding, endrede filer
```
