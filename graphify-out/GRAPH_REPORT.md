# Graph Report - Smaker  (2026-11-15)

## Corpus Check
- 75 files · ~41,714 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 5, .css 1, .lock 1)

## Summary
- 541 nodes · 1365 edges · 23 communities (21 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd037325`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- editor.tsx
- package.json
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
- RecipePage.tsx
- OnboardingPage.tsx
- quantity.ts
- seed.ts
- supabase.ts
- imports
- persistCache

## God Nodes (most connected - your core abstractions)
1. `@ionic/react` - 27 edges
2. `react` - 25 edges
3. `ionicons` - 24 edges
4. `RecipePage()` - 21 edges
5. `newId()` - 21 edges
6. `Recipe` - 19 edges
7. `ManualWizardPage()` - 15 edges
8. `HomePage()` - 15 edges
9. `ReviewForm()` - 14 edges
10. `App()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Permanent facts` --references--> `useMediaQuery()`  [INFERRED]
  memory/CLAUDE.md → src/hooks/useMediaQuery.ts
- `App-API (migrasjon `smaker_app_api`)` --references--> `Recipe`  [INFERRED]
  memory/data/datamodell.md → src/domain/types.ts
- `App-API (migrasjon `smaker_app_api`)` --references--> `ConflictError`  [INFERRED]
  memory/data/datamodell.md → src/data/remote.ts
- `Recipe Grid` --references--> `buildGrid()`  [INFERRED]
  memory/features/recipe-grid.md → src/domain/grid.ts
- `SaveButton()` --calls--> `saveRecipe()`  [EXTRACTED]
  src/components/ReviewForm.tsx → src/data/store.ts

## Import Cycles
- None detected.

## Communities (23 total, 2 thin omitted)

### Community 0 - "editor.tsx"
Cohesion: 0.09
Nodes (55): App(), Splash(), Wordmark(), ClassicView(), groupIngredients(), BasicsFields(), ChipGroup(), Draft (+47 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (49): dependencies, @fontsource/atkinson-hyperlegible@^5.3.0, @fontsource-variable/fraunces@^5.3.0, @ionic/react@^9.0.11, @ionic/react-router@^9.0.11, ionicons@^8.1.0, react@^19.3.1, react-dom@^19.3.1 (+41 more)

### Community 2 - "types.ts"
Cohesion: 0.15
Nodes (22): GridVariant, Props, TONES, GridIngredientRow, GridLayout, GridStepCell, StepInputs, ACTIONS (+14 more)

### Community 3 - "store.ts"
Cohesion: 0.12
Nodes (17): appUrl(), clearInvite(), createInviteLink(), deleteRecipe(), EMPTY, EMPTY_FAMILY, listeners, listenForChanges() (+9 more)

### Community 4 - "index.ts"
Cohesion: 0.09
Nodes (35): ALLOWED_ORIGINS, askClaude(), ConfigError, Content, ImageIn, Ingredient, MEDIA_TYPES, readImages() (+27 more)

### Community 5 - "remote.ts"
Cohesion: 0.17
Nodes (21): acceptInvite(), ConflictError, createFamily(), createInvite(), deleteRecipe(), fail(), isStoragePath(), loadFamily() (+13 more)

### Community 6 - "Smaker – prosjektminne"
Cohesion: 0.05
Nodes (38): graphify, Konvensjoner, Minne, 2026-11-15 — Bildelesing med Claude Sonnet 5.5 via Edge Function, 2026-11-15 — GitHub Pages med Actions, base-sti fra repo-navnet, 2026-11-15 — Graphify installert prosjektvis, 2026-11-15 — Ionic-faner (IonTabs) i stedet for egen fanelinje, 2026-11-15 — Ionic React for appskallet, Tailwind for innholdet (+30 more)

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

### Community 16 - "RecipePage.tsx"
Cohesion: 0.09
Nodes (58): @ionic/react, ionicons, react, react-router-dom, MainHeader(), GridView(), Legend(), Mode (+50 more)

### Community 17 - "OnboardingPage.tsx"
Cohesion: 0.28
Nodes (12): createFamily(), joinFamily(), onSignedIn(), openFamily(), parseInvite(), pendingInvite(), signOut(), useEmail() (+4 more)

### Community 18 - "quantity.ts"
Cohesion: 0.09
Nodes (40): vitest@^5.1.0, vitest, AiRecipeRead, AiStep, clean(), draftFromAiRead(), positive(), stepsFromAi() (+32 more)

### Community 19 - "seed.ts"
Cohesion: 0.17
Nodes (7): FamilyData, base, CURRENT_MEMBER_ID, SEED_FAMILY, SEED_FAVORITES, SEED_RECIPES, Family

### Community 20 - "supabase.ts"
Cohesion: 0.29
Nodes (6): @supabase/supabase-js@^2.119.0, @supabase/supabase-js, key, MEDIA_BUCKET, supabase, url

### Community 21 - "imports"
Cohesion: 0.40
Nodes (4): imports, @anthropic-ai/sdk, @supabase/supabase-js, zod

### Community 22 - "persistCache"
Cohesion: 0.29
Nodes (7): knownPaths(), rememberPaths(), cacheKey(), persistCache(), persistLocal(), readCache(), set()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `supabase.ts` to `package.json`, `store.ts`, `index.ts`, `remote.ts`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Should `editor.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08908780903665814 - nodes in this community are weakly interconnected._
- **Why does `react` connect `RecipePage.tsx` to `editor.tsx`, `package.json`, `types.ts`, `store.ts`, `OnboardingPage.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05224963715529753 - nodes in this community are weakly interconnected._
- **Why does `buildGrid()` connect `RecipePage.tsx` to `types.ts`, `quantity.ts`, `Smaker – prosjektminne`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08748615725359911 - nodes in this community are weakly interconnected._