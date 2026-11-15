# Smaker

Familiens digitale kokebok: en installerbar PWA der hele familien samler, deler og lager mat etter felles oppskrifter.

Særpreget er **Recipe Grid** (inspirert av Cooking for Engineers): en visuell matrise der rader er ingredienser, kolonner er handlinger fra venstre mot høyre, og celler som slår sammen flere ingredienser dekker alle radene deres. Parallelle prosesser (pasta som koker mens sausen lages) vises som stripete celler som venter til de slås inn.

## Kom i gang

```bash
npm install
npm run dev        # utviklingsserver
npm test           # domenetester (tolking, kobling, rutenett)
npm run test:db    # migrasjon + Row Level Security i PGlite
npm run build      # produksjonsbygg med service worker
```

Appen kjører foreløpig på lokal lagring (`localStorage`) med eksempeloppskrifter.

### Supabase

Tabellene ligger i Supabase-prosjektet **DailyPep**, som deles med andre apper. Derfor har alt for Smaker prefikset `smaker_`:

| Tabell | Innhold |
|---|---|
| `smaker_families`, `smaker_family_members`, `smaker_family_invites` | Familiegrupper, roller (eier/admin/medlem), engangsinvitasjoner |
| `smaker_recipes` | Oppskrift: navn, historie, opphav, porsjoner, tid, kategorier |
| `smaker_ingredients`, `smaker_steps`, `smaker_step_inputs` | Grafen: ingredienser, steg, og hva som går inn i hvert steg |
| `smaker_attachments` | Bilder og originalskanninger (filer i bøtta `smaker-media`) |
| `smaker_favorites`, `smaker_recipe_versions` | Favoritter per person, versjonshistorikk |

RPC-er: `smaker_create_family_invite`, `smaker_accept_family_invite`. Migrasjoner i `supabase/migrations/`, testet med `npm run test:db`.

## Arkitektur

| Lag | Hva | Hvor |
|---|---|---|
| Datamodell | Oppskrift som graf: ingredienser → steg → mellomprodukter | `src/domain/types.ts` |
| Recipe Grid | Beregner kolonner, rader, spenn og spor fra grafen. Ingenting om rutenettet lagres | `src/domain/grid.ts` |
| Tolking | Innlimt tekst → utkast. Finner aldri på mengder eller tider | `src/domain/parseRecipeText.ts`, `quantity.ts` |
| Kobling | Foreslår hvilke ingredienser/steg som går inn i hvert steg | `src/domain/linker.ts` |
| Lagring | Lokalt repository med versjonshistorikk. Byttes til Supabase her | `src/data/store.ts` |
| UI | Ionic React for skall og navigasjon, Tailwind v4 for innhold | `src/components`, `src/pages` |
| Database | Postgres-skjema med RLS per familie, invitasjoner, lagring | `supabase/migrations/` |

**Mobil først:** alle grunnstiler er for mobil; `sm:`/`md:` legger til for større skjermer. Test alltid på 360 px bredde.

### Designsystem

- Farger og fonter er tokens i `src/index.css` (`@theme`), og Ionic temes fra de samme.
- **Fraunces** (titler) + **Atkinson Hyperlegible** (brødtekst – laget for lesbarhet).
- Oppskrifter uten bilde får et rutete duk-omslag med initial.
- Manglende informasjon markeres med stripet safranfarge (`.missing`).

## Status

Ferdig i denne runden:
- Grunnstruktur, designsystem, PWA-manifest og ikoner
- Hjem (søk, kategorier, favoritter, nylig lagt til, alle)
- Oppskrift: klassisk visning og Recipe Grid (fullt rutenett på store skjermer; kompakt rutenett eller steg-for-steg med minikart på mobil)
- Matlagingsmodus: stor tekst, ett steg, tidtakere med lyd/vibrasjon, skjermen holdes våken, porsjonsomregning
- Innlegging: lim inn (tolking + automatisk kobling), bilde (originalen lagres; tekstgjenkjenning er et grensesnitt uten motor ennå), manuell veiviser i fire steg
- Familieside med invitasjonslenke (demo), versjonshistorikk med gjenoppretting
- Supabase-tabeller med RLS opprettet i DailyPep-prosjektet, testet

Neste:
- Koble på Supabase (auth, `save_recipe`-RPC som lagrer graf + versjon atomisk, sanntidssynk)
- Tekstgjenkjenning for bilder (Edge Function med bildemodell, eller Tesseract.js offline)
- Offline-kø for endringer, kodesplitting (Ionic gjør hovedbundelen stor)
