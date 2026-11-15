# Graph Report - Smaker  (2026-11-15)

## Corpus Check
- 68 files · ~35,491 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 5, .css 1, .lock 1)

## Summary
- 487 nodes · 1192 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0fb0e927`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- editor.tsx
- App.tsx
- types.ts
- store.ts
- index.ts
- remote.ts
- Smaker – prosjektminne
- compilerOptions
- steps
- Fase 2: Konsolider minnet (betinget)
- rls-check.mjs
- /commit — Commit + push + lagre økten
- /resume — Last inn konteksten fra forrige økt
- .claude/CLAUDE.md
- memorize.md
- Smaker
- quantity.ts
- package.json
- devDependencies
- vite.config.ts
- scripts
- imports

## God Nodes (most connected - your core abstractions)
1. `@ionic/react` - 26 edges
2. `react` - 24 edges
3. `ionicons` - 23 edges
4. `RecipePage()` - 21 edges
5. `Recipe` - 19 edges
6. `newId()` - 17 edges
7. `ManualWizardPage()` - 15 edges
8. `HomePage()` - 15 edges
9. `formatAmount()` - 14 edges
10. `useStore()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Permanent facts` --references--> `useMediaQuery()`  [INFERRED]
  memory/CLAUDE.md → src/hooks/useMediaQuery.ts
- `App-API (migrasjon `smaker_app_api`)` --references--> `Recipe`  [INFERRED]
  memory/data/datamodell.md → src/domain/types.ts
- `App-API (migrasjon `smaker_app_api`)` --references--> `ConflictError`  [INFERRED]
  memory/data/datamodell.md → src/data/remote.ts
- `2026-11-15 — Bildelesing med Claude Sonnet 5.5 via Edge Function` --references--> `readWithClaude()`  [INFERRED]
  memory/architecture/decisions.md → supabase/functions/smaker-read-recipe/index.ts
- `Recipe Grid` --references--> `buildGrid()`  [INFERRED]
  memory/features/recipe-grid.md → src/domain/grid.ts

## Import Cycles
- None detected.

## Communities (22 total, 2 thin omitted)

### Community 0 - "editor.tsx"
Cohesion: 0.09
Nodes (50): BasicsFields(), ChipGroup(), Draft, draftToPreview(), emptyDraft(), Field(), IngredientsEditor(), IssueList() (+42 more)

### Community 1 - "App.tsx"
Cohesion: 0.09
Nodes (38): dependencies, @fontsource/atkinson-hyperlegible@^5.3.0, @fontsource-variable/fraunces@^5.3.0, @ionic/react@^9.0.11, @ionic/react-router@^9.0.11, ionicons@^8.1.0, react@^19.3.1, react-dom@^19.3.1 (+30 more)

### Community 2 - "types.ts"
Cohesion: 0.07
Nodes (43): Permanent facts, Algoritme, Recipe Grid, Visning, GridView(), Legend(), Mode, GridVariant (+35 more)

### Community 3 - "store.ts"
Cohesion: 0.08
Nodes (56): MainHeader(), RecipeCard(), Avatar(), originMember(), RecipeCover(), SectionTitle(), ServingsStepper(), knownPaths() (+48 more)

### Community 4 - "index.ts"
Cohesion: 0.09
Nodes (21): 2026-11-15 — Bildelesing med Claude Sonnet 5.5 via Edge Function, 2026-11-15 — GitHub Pages med Actions, base-sti fra repo-navnet, 2026-11-15 — Graphify installert prosjektvis, 2026-11-15 — Ionic-faner (IonTabs) i stedet for egen fanelinje, 2026-11-15 — Ionic React for appskallet, Tailwind for innholdet, 2026-11-15 — Lagring som én RPC med hele grafen, 2026-11-15 — Magisk lenke + engangskode, 2026-11-15 — Minne i repoet i stedet for ~/vault (+13 more)

### Community 5 - "remote.ts"
Cohesion: 0.12
Nodes (28): @supabase/supabase-js@^2.119.0, @supabase/supabase-js, acceptInvite(), ConflictError, createFamily(), createInvite(), deleteRecipe(), fail() (+20 more)

### Community 6 - "Smaker – prosjektminne"
Cohesion: 0.09
Nodes (21): graphify, Konvensjoner, Minne, Aldri, Kommandoer, Regler for notater, Smaker – prosjektminne, Stack (+13 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, runs-on, steps, VITE_BASE, jobs, deploy (+15 more)

### Community 9 - "Fase 2: Konsolider minnet (betinget)"
Cohesion: 0.18
Nodes (10): 2.1 Kandidater – minst ett kriterium, 2.2 Sjekk duplikater, 2.3 Skriv etter mål, 2.4 Lenk, 2.5 Commit og push (påkrevd i cloud), 2.6 Rapport, Fase 1: Øktlogg (alltid), Fase 2: Konsolider minnet (betinget) (+2 more)

### Community 10 - "rls-check.mjs"
Cohesion: 0.12
Nodes (8): db, ing1, ing2, MIG, recipe, rid, st1, st2

### Community 11 - "/commit — Commit + push + lagre økten"
Cohesion: 0.33
Nodes (5): 1. Se på endringene, 2. Lag commit-meldingen, 3. Bekreft, så utfør, 4. Lagre økten, /commit — Commit + push + lagre økten

### Community 12 - "/resume — Last inn konteksten fra forrige økt"
Cohesion: 0.40
Nodes (4): Last inn, /resume — Last inn konteksten fra forrige økt, Utdata (kompakt), Varianter

### Community 15 - "Smaker"
Cohesion: 0.22
Nodes (8): Arkitektur, Designsystem, Innlogging, Kom i gang, Publisering (GitHub Pages), Smaker, Status, Supabase

### Community 16 - "quantity.ts"
Cohesion: 0.11
Nodes (29): react, ClassicView(), groupIngredients(), toRaw(), StepFocus(), MissingMark(), inputsForStep(), AMOUNT_RE (+21 more)

### Community 17 - "package.json"
Cohesion: 0.17
Nodes (11): react-router@^6.30.6, description, @electric-sql/pglite@^0.5.16, typescript@~5.9, name, private, type, version (+3 more)

### Community 18 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss@^4.3.5, @types/node@^22.20.5, @types/react@^19.3.0, @types/react-dom@^19.3.0, vitest@^5.1.0, tailwindcss, @types/node (+3 more)

### Community 19 - "vite.config.ts"
Cohesion: 0.22
Nodes (8): @tailwindcss/vite@^4.3.5, vite@^8.3.8, vite-plugin-pwa@^2.0.0, @vitejs/plugin-react@^6.3.0, @tailwindcss/vite, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 20 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:db, typecheck

### Community 21 - "imports"
Cohesion: 0.40
Nodes (4): imports, @anthropic-ai/sdk, @supabase/supabase-js, zod

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `remote.ts` to `package.json`, `store.ts`, `index.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `editor.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09027777777777778 - nodes in this community are weakly interconnected._
- **Why does `react` connect `quantity.ts` to `editor.tsx`, `App.tsx`, `types.ts`, `store.ts`, `package.json`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09219858156028368 - nodes in this community are weakly interconnected._
- **Why does `@electric-sql/pglite` connect `package.json` to `rls-check.mjs`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06848357791754019 - nodes in this community are weakly interconnected._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07972027972027972 - nodes in this community are weakly interconnected._