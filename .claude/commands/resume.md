# /resume — Last inn konteksten fra forrige økt

Tilpasset fra lucasrosati/claude-code-memory-setup: vaultet ligger i `memory/` i repoet.

## Last inn
1. `root=$(git rev-parse --show-toplevel); vault="$root/memory"`
2. Les `<vault>/CLAUDE.md` (regler + `## Permanent facts`).
3. List loggene nyest først: `ls -t "$vault/logs"/*.md 2>/dev/null | head -20`. Les de 3 siste (eller antallet som er bedt om).
4. Les de siste oppføringene i `<vault>/architecture/decisions.md` – fra slutten, de siste `## `-overskriftene, ikke hele filen.
5. Sjekk `git log --oneline -10` og `git status` for endringer som ikke er logget.
6. Et punkt under «Gjenstår» er et øyeblikksbilde fra fortiden. En frist teller bare hvis datoen ikke har passert.

## Varianter
- `/resume` → 3 siste logger
- `/resume 5` → 5 siste logger
- `/resume grid` → 3 siste + søk etter «grid» i alle logger
- `/resume 5 grid` → 5 siste + søk

## Utdata (kompakt)
- **Siste økt:** dato + hva som ble gjort
- **Nylige beslutninger:** de 3 siste
- **Gjenstår:** `- [ ]`-punkter fra nylige logger, kontrollert etter punkt 6
- **Tilstand for gjenopptak:** fra nyeste logg
- **Aktiv kontekst:** hvilken del av prosjektet vi jobbet med

Avslutt med: «Konteksten er lastet. Hva jobber vi med i dag?»
