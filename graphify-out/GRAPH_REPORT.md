# Graph Report - Smaker  (2026-11-15)

## Corpus Check
- 60 files · ~31,510 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 5, .css 1)

## Summary
- 426 nodes · 1086 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cc38e652`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- editor.tsx
- package.json
- types.ts
- store.ts
- RecipePage.tsx
- remote.ts
- Smaker – prosjektminne
- compilerOptions
- quantity.ts
- Fase 2: Konsolider minnet (betinget)
- rls.test.mjs
- /commit — Commit + push + lagre økten
- /resume — Last inn konteksten fra forrige økt
- .claude/CLAUDE.md
- memorize.md
- Smaker
- RecipePage.tsx

## God Nodes (most connected - your core abstractions)
1. `@ionic/react` - 25 edges
2. `react` - 23 edges
3. `ionicons` - 21 edges
4. `RecipePage()` - 21 edges
5. `Recipe` - 19 edges
6. `HomePage()` - 16 edges
7. `App()` - 15 edges
8. `newId()` - 15 edges
9. `FamilyPage()` - 15 edges
10. `ManualWizardPage()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Permanent facts` --references--> `useMediaQuery()`  [INFERRED]
  memory/CLAUDE.md → src/hooks/useMediaQuery.ts
- `App-API (migrasjon `smaker_app_api`)` --references--> `ConflictError`  [INFERRED]
  memory/data/datamodell.md → src/data/remote.ts
- `Recipe Grid` --references--> `buildGrid()`  [INFERRED]
  memory/features/recipe-grid.md → src/domain/grid.ts
- `App-API (migrasjon `smaker_app_api`)` --references--> `Recipe`  [INFERRED]
  memory/data/datamodell.md → src/domain/types.ts
- `App()` --calls--> `FamilyPage()`  [EXTRACTED]
  src/App.tsx → src/pages/FamilyPage.tsx

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "editor.tsx"
Cohesion: 0.13
Nodes (34): react, BasicsFields(), ChipGroup(), Draft, draftToPreview(), emptyDraft(), Field(), IngredientsEditor() (+26 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (48): dependencies, @fontsource/atkinson-hyperlegible@^5.3.0, @fontsource-variable/fraunces@^5.3.0, @ionic/react@^9.0.11, @ionic/react-router@^9.0.11, ionicons@^8.1.0, react@^19.3.1, react-dom@^19.3.1 (+40 more)

### Community 2 - "types.ts"
Cohesion: 0.08
Nodes (37): GridView(), Legend(), Mode, GridVariant, Props, RecipeGrid(), StepFocus(), TONES (+29 more)

### Community 3 - "store.ts"
Cohesion: 0.08
Nodes (52): MainHeader(), TabBar(), SectionTitle(), knownPaths(), rememberPaths(), cacheKey(), clearInvite(), createFamily() (+44 more)

### Community 4 - "RecipePage.tsx"
Cohesion: 0.14
Nodes (21): @ionic/react, react-router-dom, App(), Splash(), NAV, Wordmark(), authMessage(), sendMagicLink() (+13 more)

### Community 5 - "remote.ts"
Cohesion: 0.12
Nodes (27): @supabase/supabase-js@^2.119.0, @supabase/supabase-js, acceptInvite(), ConflictError, createFamily(), createInvite(), deleteRecipe(), fail() (+19 more)

### Community 6 - "Smaker – prosjektminne"
Cohesion: 0.06
Nodes (32): graphify, Konvensjoner, Minne, 2026-11-15 — Graphify installert prosjektvis, 2026-11-15 — Ionic React for appskallet, Tailwind for innholdet, 2026-11-15 — Lagring som én RPC med hele grafen, 2026-11-15 — Magisk lenke + engangskode, 2026-11-15 — Minne i repoet i stedet for ~/vault (+24 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 8 - "quantity.ts"
Cohesion: 0.10
Nodes (30): StepsEditor(), ACTIONS, autoLink(), extractStepMeta(), guessAction(), ingredientKeys(), mentions(), PREP_VERBS (+22 more)

### Community 9 - "Fase 2: Konsolider minnet (betinget)"
Cohesion: 0.18
Nodes (10): 2.1 Kandidater – minst ett kriterium, 2.2 Sjekk duplikater, 2.3 Skriv etter mål, 2.4 Lenk, 2.5 Commit og push (påkrevd i cloud), 2.6 Rapport, Fase 1: Øktlogg (alltid), Fase 2: Konsolider minnet (betinget) (+2 more)

### Community 10 - "rls.test.mjs"
Cohesion: 0.12
Nodes (8): db, ing1, ing2, MIG, recipe, rid, st1, st2

### Community 11 - "/commit — Commit + push + lagre økten"
Cohesion: 0.33
Nodes (5): 1. Se på endringene, 2. Lag commit-meldingen, 3. Bekreft, så utfør, 4. Lagre økten, /commit — Commit + push + lagre økten

### Community 12 - "/resume — Last inn konteksten fra forrige økt"
Cohesion: 0.40
Nodes (4): Last inn, /resume — Last inn konteksten fra forrige økt, Utdata (kompakt), Varianter

### Community 15 - "Smaker"
Cohesion: 0.25
Nodes (7): Arkitektur, Designsystem, Innlogging, Kom i gang, Smaker, Status, Supabase

### Community 16 - "RecipePage.tsx"
Cohesion: 0.21
Nodes (19): ionicons, ClassicView(), groupIngredients(), RecipeCard(), Avatar(), MissingMark(), originMember(), RecipeCover() (+11 more)

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `editor.tsx` to `package.json`, `types.ts`, `store.ts`, `RecipePage.tsx`, `RecipePage.tsx`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Should `editor.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12846068660022147 - nodes in this community are weakly interconnected._
- **Why does `buildGrid()` connect `types.ts` to `quantity.ts`, `Smaker – prosjektminne`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.054693877551020405 - nodes in this community are weakly interconnected._
- **Why does `Recipe Grid` connect `Smaker – prosjektminne` to `types.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08067375886524823 - nodes in this community are weakly interconnected._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._