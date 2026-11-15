# Graph Report - Smaker  (2026-11-15)

## Corpus Check
- 51 files · ~23,057 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 5, .example 1, .css 1)

## Summary
- 322 nodes · 828 edges · 16 communities (12 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f22b965`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- editor.tsx
- package.json
- RecipePage.tsx
- HomePage.tsx
- types.ts
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
- README.md

## God Nodes (most connected - your core abstractions)
1. `@ionic/react` - 23 edges
2. `react` - 20 edges
3. `ionicons` - 19 edges
4. `RecipePage()` - 19 edges
5. `Recipe` - 16 edges
6. `ManualWizardPage()` - 15 edges
7. `formatAmount()` - 14 edges
8. `CookingModePage()` - 14 edges
9. `HomePage()` - 14 edges
10. `compilerOptions` - 14 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `AddRecipePage()`  [EXTRACTED]
  src/App.tsx → src/pages/AddRecipePage.tsx
- `App()` --calls--> `CookingModePage()`  [EXTRACTED]
  src/App.tsx → src/pages/CookingModePage.tsx
- `App()` --calls--> `ManualWizardPage()`  [EXTRACTED]
  src/App.tsx → src/pages/ManualWizardPage.tsx
- `App()` --calls--> `PastePage()`  [EXTRACTED]
  src/App.tsx → src/pages/PastePage.tsx
- `App()` --calls--> `PhotoPage()`  [EXTRACTED]
  src/App.tsx → src/pages/PhotoPage.tsx

## Import Cycles
- None detected.

## Communities (16 total, 4 thin omitted)

### Community 0 - "editor.tsx"
Cohesion: 0.11
Nodes (40): BasicsFields(), ChipGroup(), Draft, draftToPreview(), emptyDraft(), Field(), IngredientsEditor(), IssueList() (+32 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (48): dependencies, @fontsource/atkinson-hyperlegible@^5.3.0, @fontsource-variable/fraunces@^5.3.0, @ionic/react@^9.0.11, @ionic/react-router@^9.0.11, ionicons@^8.1.0, react@^19.3.1, react-dom@^19.3.1 (+40 more)

### Community 2 - "RecipePage.tsx"
Cohesion: 0.11
Nodes (38): ionicons, react, ClassicView(), groupIngredients(), GridView(), Legend(), Mode, GridVariant (+30 more)

### Community 3 - "HomePage.tsx"
Cohesion: 0.18
Nodes (24): @ionic/react, react-router-dom, App(), MainHeader(), NAV, TabBar(), Wordmark(), RecipeCard() (+16 more)

### Community 4 - "types.ts"
Cohesion: 0.13
Nodes (25): GridIngredientRow, GridLayout, GridStepCell, StepInputs, ACTIONS, DraftStep, ingredientKeys(), mentions() (+17 more)

### Community 5 - "store.ts"
Cohesion: 0.12
Nodes (16): base, CURRENT_MEMBER_ID, SEED_FAMILY, SEED_FAVORITES, SEED_RECIPES, commit(), currentMemberId, deleteRecipe() (+8 more)

### Community 6 - "Smaker – prosjektminne"
Cohesion: 0.11
Nodes (15): graphify, Konvensjoner, Minne, 2026-11-15 — Graphify installert prosjektvis, 2026-11-15 — Ionic React for appskallet, Tailwind for innholdet, 2026-11-15 — Minne i repoet i stedet for ~/vault, Beslutninger, Aldri (+7 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 8 - "quantity.ts"
Cohesion: 0.18
Nodes (13): AMOUNT_RE, COMMON_UNITS, formatDecimal(), formatNumber(), FRACTION_UNITS, NICE_FRACTIONS, normalizeUnit(), NUM (+5 more)

### Community 9 - "Fase 2: Konsolider minnet (betinget)"
Cohesion: 0.18
Nodes (10): 2.1 Kandidater – minst ett kriterium, 2.2 Sjekk duplikater, 2.3 Skriv etter mål, 2.4 Lenk, 2.5 Commit og push (påkrevd i cloud), 2.6 Rapport, Fase 1: Øktlogg (alltid), Fase 2: Konsolider minnet (betinget) (+2 more)

### Community 11 - "/commit — Commit + push + lagre økten"
Cohesion: 0.33
Nodes (5): 1. Se på endringene, 2. Lag commit-meldingen, 3. Bekreft, så utfør, 4. Lagre økten, /commit — Commit + push + lagre økten

### Community 12 - "/resume — Last inn konteksten fra forrige økt"
Cohesion: 0.40
Nodes (4): Last inn, /resume — Last inn konteksten fra forrige økt, Utdata (kompakt), Varianter

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `RecipePage.tsx` to `editor.tsx`, `package.json`, `HomePage.tsx`, `store.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `editor.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11137254901960784 - nodes in this community are weakly interconnected._
- **Why does `@ionic/react` connect `HomePage.tsx` to `editor.tsx`, `package.json`, `RecipePage.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.054693877551020405 - nodes in this community are weakly interconnected._
- **Why does `ionicons` connect `RecipePage.tsx` to `editor.tsx`, `package.json`, `HomePage.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `RecipePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11020408163265306 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._