## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Minne

Prosjektets varige minne ligger i `memory/` (et Obsidian-vault i repoet, se `memory/CLAUDE.md`).
Kommandoer: `/resume` ved start av en økt, `/memorize` for å feste noe midt i økten, `/save` ved slutt, `/commit` for commit + push + lagring.
Øktene kjører i cloud-maskiner som slettes – det som ikke committes og pushes, forsvinner.

## Konvensjoner
- Brukergrensesnitt og notater på norsk (bokmål).
- **Mobil først.** Grunnstiler er for mobil, `sm:`/`md:` legger til. Sjekk alltid på 360 px bredde før større skjermer.
- Recipe Grid og klassisk visning utledes alltid fra de samme oppskriftsdataene – lagre aldri layout.
- Finn aldri på mengder eller tider ved tolking. Manglende informasjon markeres (`.missing`).
- Kjør `npm test` og `npm run test:db` etter endringer i `src/domain/` eller `supabase/`.
