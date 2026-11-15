# Graph Report - Smaker  (2026-11-15)

## Corpus Check
- 55 files · ~25,071 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 5, .example 1, .css 1)

## Summary
- 342 nodes · 856 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `91ecaddf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- editor.tsx
- package.json
- types.ts
- HomePage.tsx
- RecipePage.tsx
- store.ts
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

## God Nodes (most connected - your core abstractions)
1. `@ionic/react` - 23 edges
2. `react` - 20 edges
3. `RecipePage()` - 19 edges
4. `ionicons` - 19 edges
5. `Recipe` - 16 edges
6. `ManualWizardPage()` - 15 edges
7. `formatAmount()` - 14 edges
8. `CookingModePage()` - 14 edges
9. `HomePage()` - 14 edges
10. `compilerOptions` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Permanent facts` --references--> `useMediaQuery()`  [INFERRED]
  memory/CLAUDE.md → src/hooks/useMediaQuery.ts
- `Recipe Grid` --references--> `buildGrid()`  [INFERRED]
  memory/features/recipe-grid.md → src/domain/grid.ts
- `Issue` --references--> `Id`  [EXTRACTED]
  src/domain/validate.ts → src/domain/types.ts
- `State` --references--> `Recipe`  [EXTRACTED]
  src/data/store.ts → src/domain/types.ts
- `IngredientsEditor()` --calls--> `newId()`  [EXTRACTED]
  src/components/editor.tsx → src/domain/ids.ts

## Import Cycles
- None detected.

## Communities (16 total, 3 thin omitted)

### Community 0 - "editor.tsx"
Cohesion: 0.17
Nodes (29): BasicsFields(), ChipGroup(), Draft, draftToPreview(), emptyDraft(), Field(), IngredientsEditor(), IssueList() (+21 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (48): dependencies, @fontsource/atkinson-hyperlegible@^5.3.0, @fontsource-variable/fraunces@^5.3.0, @ionic/react@^9.0.11, @ionic/react-router@^9.0.11, ionicons@^8.1.0, react@^19.3.1, react-dom@^19.3.1 (+40 more)

### Community 2 - "types.ts"
Cohesion: 0.10
Nodes (38): Permanent facts, ClassicView(), groupIngredients(), GridView(), Legend(), Mode, GridVariant, Props (+30 more)

### Community 3 - "HomePage.tsx"
Cohesion: 0.21
Nodes (21): ionicons, MainHeader(), NAV, TabBar(), Wordmark(), RecipeCard(), Avatar(), RecipeCover() (+13 more)

### Community 4 - "RecipePage.tsx"
Cohesion: 0.12
Nodes (28): @ionic/react, react, react-router-dom, App(), FormPage(), ServingsStepper(), memberName(), useRecipe() (+20 more)

### Community 5 - "store.ts"
Cohesion: 0.10
Nodes (21): base, CURRENT_MEMBER_ID, SEED_FAMILY, SEED_FAVORITES, SEED_RECIPES, commit(), createInviteLink(), currentMemberId (+13 more)

### Community 6 - "Smaker – prosjektminne"
Cohesion: 0.07
Nodes (26): graphify, Konvensjoner, Minne, 2026-11-15 — Graphify installert prosjektvis, 2026-11-15 — Ionic React for appskallet, Tailwind for innholdet, 2026-11-15 — Minne i repoet i stedet for ~/vault, 2026-11-15 — Smaker-tabellene i det delte DailyPep-prosjektet, Beslutninger (+18 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 8 - "quantity.ts"
Cohesion: 0.13
Nodes (20): CATEGORY_HINTS, Meta, parseRecipeText(), readMeta(), RecipeDraft, splitSteps(), AMOUNT_RE, COMMON_UNITS (+12 more)

### Community 9 - "Fase 2: Konsolider minnet (betinget)"
Cohesion: 0.18
Nodes (10): 2.1 Kandidater – minst ett kriterium, 2.2 Sjekk duplikater, 2.3 Skriv etter mål, 2.4 Lenk, 2.5 Commit og push (påkrevd i cloud), 2.6 Rapport, Fase 1: Øktlogg (alltid), Fase 2: Konsolider minnet (betinget) (+2 more)

### Community 11 - "/commit — Commit + push + lagre økten"
Cohesion: 0.33
Nodes (5): 1. Se på endringene, 2. Lag commit-meldingen, 3. Bekreft, så utfør, 4. Lagre økten, /commit — Commit + push + lagre økten

### Community 12 - "/resume — Last inn konteksten fra forrige økt"
Cohesion: 0.40
Nodes (4): Last inn, /resume — Last inn konteksten fra forrige økt, Utdata (kompakt), Varianter

### Community 15 - "Smaker"
Cohesion: 0.29
Nodes (6): Arkitektur, Designsystem, Kom i gang, Smaker, Status, Supabase

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildGrid()` connect `types.ts` to `store.ts`, `Smaker – prosjektminne`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.054693877551020405 - nodes in this community are weakly interconnected._
- **Why does `Recipe Grid` connect `Smaker – prosjektminne` to `types.ts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10048309178743961 - nodes in this community are weakly interconnected._
- **Why does `react` connect `RecipePage.tsx` to `editor.tsx`, `package.json`, `types.ts`, `HomePage.tsx`, `store.ts`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Should `RecipePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12181616832779624 - nodes in this community are weakly interconnected._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10114942528735632 - nodes in this community are weakly interconnected._