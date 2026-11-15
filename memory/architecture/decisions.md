---
title: Beslutninger
tags: [smaker, beslutninger]
created: 2026-11-15
updated: 2026-11-15
status: active
type: decision
---

# Beslutninger

Nyeste nederst. Hver beslutning: Kontekst, Alternativer, Beslutning, Begrunnelse. Se også [[CLAUDE]].

## 2026-11-15 — Minne i repoet i stedet for ~/vault
- **Kontekst:** claude-code-memory-setup antar et Obsidian-vault i `~/vault` på egen maskin. Øktene kjører i cloud-maskiner som slettes.
- **Alternativer:** `~/vault` i maskinen (forsvinner), vente til lokal maskin, vault i repoet.
- **Beslutning:** Vault i `memory/` i repoet, kommandoer i `.claude/commands/`. `/save` committer og pusher.
- **Begrunnelse:** Bare committet innhold overlever mellom øktene. SessionEnd-autolagringen er utelatt fordi den kjører etter økten og aldri blir committet.

## 2026-11-15 — Graphify installert prosjektvis
- **Kontekst:** Ønske om kunnskapsgraf over kodebasen.
- **Alternativer:** Global installasjon (forsvinner med maskinen), prosjektvis.
- **Beslutning:** `graphify install --project --platform claude` (skill + hooks i `.claude/`). CLI-et installeres av miljøets oppstartsskript (`uv tool install graphifyy`).
- **Begrunnelse:** Skill og hooks følger repoet; CLI-et må installeres på nytt i hver ny maskin.

## 2026-11-15 — Ionic React for appskallet, Tailwind for innholdet
- **Kontekst:** Brukeren ønsker Ionic. Appen skal føles som en ekte mobilapp og være enkel for besteforeldre.
- **Alternativer:** Ren Tailwind med egne komponenter; Ionic for alt; Ionic for skall + Tailwind for innhold.
- **Beslutning:** Ionic 9 (`@ionic/react`, `@ionic/react-router`) for faner, navigasjon, bunnark, søk og segmenter. Tailwind v4 for kort, Recipe Grid og matlagingsmodus. Ionic temes med egne farger/fonter via CSS-variabler, `mode: 'ios'` overalt for likt utseende.
- **Begrunnelse:** Native gester og overganger gratis, uten at det egne designet (særlig Recipe Grid) må presses inn i ferdige komponenter.
- **Følge:** `@ionic/react-router` 9 krever React Router 6 (`>=6.4 <7`), så vi bruker 6.x – ikke 7.

## 2026-11-15 — Smaker-tabellene i det delte DailyPep-prosjektet
- **Kontekst:** Brukeren ba om at lagringen skal ligge i Supabase-prosjektet DailyPep, som allerede brukes av andre apper (dailypep_, ting_, things_ i `public`).
- **Alternativer:** Eget skjema `smaker` (krever at skjemaet eksponeres i API-innstillingene), generiske navn i `public` (kollisjonsfare), prefiks `smaker_` i `public`.
- **Beslutning:** Prefiks `smaker_` på alle objekter i `public`, som de andre appene. Interne hjelpefunksjoner i eget skjema `smaker_private`. Bøtte `smaker-media`.
- **Begrunnelse:** Følger prosjektets konvensjon, virker med standard API-oppsett, og kan ikke kollidere med de andre appene. Brede `revoke … on all functions in schema public` ble fjernet fra migrasjonen fordi det ville ødelagt de andre appenes RPC-er. Lagringsreglene sammenligner mappenavn som tekst, så filer i andre apper sine bøtter ikke kan få reglene til å feile.

## 2026-11-15 — Magisk lenke + engangskode
- **Kontekst:** Brukeren valgte magisk lenke. En PWA installert på hjemskjermen på iPhone har egen lagring, adskilt fra Safari, så en lenke i e-posten logger inn i Safari, ikke i appen.
- **Alternativer:** Bare lenke; Google-innlogging; e-post + passord.
- **Beslutning:** `signInWithOtp` (lenke) + `verifyOtp` med koden fra samme e-post. Implisitt flyt (ikke PKCE), så lenken virker også om den åpnes på en annen enhet.
- **Begrunnelse:** Ingen passord for besteforeldre, og fungerer i installert app. Krever `{{ .Token }}` i e-postmalen og at Smakers adresser står i Redirect URLs (gjøres i dashbordet – malen deles med de andre appene).

## 2026-11-15 — Lagring som én RPC med hele grafen
- **Kontekst:** En oppskrift er mange rader (ingredienser, steg, koblinger). Delvis lagring ville gitt ødelagte rutenett.
- **Beslutning:** `smaker_save_recipe` (SECURITY INVOKER, så RLS gjelder) erstatter alt i én transaksjon og lagrer versjon. Optimistisk samtidighet via versjonsnummer.
- **Begrunnelse:** Atomisk, enkel klient, versjonshistorikk gratis.

## 2026-11-15 — GitHub Pages med Actions, base-sti fra repo-navnet
- **Kontekst:** Brukeren vil ha appen på GitHub Pages. Pages serverer under `/<repo>/` og har ingen SPA-fallback.
- **Alternativer:** HashRouter (stygge URL-er, bryter magisk lenke med `#access_token`), egen domene, `404.html`-triks.
- **Beslutning:** Actions-workflow som bygger med `VITE_BASE=/<repo>/`, kopierer `index.html` → `404.html`, og publiserer med `deploy-pages`. Ruter, PWA-scope, service worker og lenker følger `BASE_URL`.
- **Begrunnelse:** Vanlige URL-er, magisk lenke virker (bruker URL-fragment), direkte lenker til oppskrifter og invitasjoner virker. Brukeren ga eksplisitt lov til å pushe til `main`.

## 2026-11-15 — Pages fra gh-pages-branch (ikke Actions-artefakt)
- **Kontekst:** `deploy-pages` krever at Pages er slått på i innstillingene. Workflow-tokenet kan ikke slå det på («Resource not accessible by integration»), og vi har ikke verktøy for repoinnstillinger.
- **Beslutning:** Workflowen bygger og force-pusher `dist/` til `gh-pages` (med `.nojekyll` og `404.html`). Første `gh-pages` ble pushet fra Claude-økten for å utløse automatisk aktivering.
- **Begrunnelse:** Virker med standard `GITHUB_TOKEN` (`contents: write`); en push til `gh-pages` aktiverer Pages på offentlige repoer.

## 2026-11-15 — Ionic-faner (IonTabs) i stedet for egen fanelinje
- **Kontekst:** Brukeren meldte at «Oppskrifter»/«Familien» sluttet å virke etter frem-og-tilbake-trykk (på telefon). Egen fanelinje byttet side med `router.push(path, 'none', 'replace')` i én felles stabel. Ionic tolker retning `'none'` som fanebytte og forventer `IonTabs`; koden har egne sikkerhetsnett for sider som blir hengende usynlige. Feilen lot seg ikke gjenskape i Chromium (WebKit finnes ikke i cloud-maskinen).
- **Beslutning:** `IonTabs` + `IonTabBar` for Hjem/Familien; detaljsider i ytre outlet. Etter lagring navigeres det med `'root'`, så «tilbake» går til kokeboka.
- **Begrunnelse:** Ionic sitt eget, testede mønster for faner. 18 navigasjonssjekker (raske trykk med nedskrudd CPU, oppskrift/legg til/lagring → faner, direkte lenker, PC-meny) passerer.

## 2026-11-15 — Bildelesing med Claude Sonnet 5.5 via Edge Function
- **Kontekst:** Skjermbilder og håndskrevne oppskriftskort skal bli strukturerte oppskrifter. Vanlig OCR er svak på håndskrift og forstår ikke struktur.
- **Alternativer:** Tesseract.js (offline, svak på håndskrift); OpenAI mini/nano; Claude Haiku 5.5; Claude Sonnet 5.5. Brukeren valgte Sonnet 5.5 for alt (best på håndskrift blant alternativene som ble vurdert; ~0,1–0,2 kr per bilde).
- **Beslutning:** Edge Function `smaker-read-recipe` (verify_jwt) → `client.beta.messages.parse` med `betaZodOutputFormat`, effort `medium`, server-side fallback `"default"`. Modellen refererer til ingredienser/steg med indekser; klienten (`fromAiRead.ts`) gir UUID-er og validerer koblinger. Døgngrense 40 per bruker, logg i `smaker_ai_usage`.
- **Begrunnelse:** Nøkkelen holdes på serveren, kostnaden er begrenset, og resultatet går rett inn i samme kontrollskjema som innliming. Modellkallet er isolert i `readWithClaude`, så en annen leverandør kan sammenlignes senere.

## 2026-11-15 — Lenkeimport og foreslått fremgangsmåte
- **Kontekst:** Brukeren vil lime inn lenker til oppskriftssider, og TikTok-oppskrifter mangler ofte fremgangsmåte i teksten.
- **Beslutning:** Lenker hentes i Edge Function-en (CORS, vern mot interne adresser, 3 MB, 12 s). schema.org/Recipe (JSON-LD) leses deterministisk – ingen modellkostnad; ellers leser Claude sideteksten. Manglende steg kan foreslås av Claude på brukerens forespørsel; `smaker_steps.suggested` merker dem til de godkjennes/redigeres. Tider/temperaturer i forslag settes alltid til null.
- **Begrunnelse:** Det meste av norske oppskriftssider har JSON-LD, så de fleste lenker er gratis og eksakte. Merking holder skillet mellom original og gjetning tydelig for familien.

## 2026-11-15 — Oversettelse til norsk og omregning av mål
- **Kontekst:** Brukeren vil at engelske (og andre utenlandske) oppskrifter oversettes til norsk.
- **Beslutning:** Språk sjekkes med sidens `lang` + ordtest (`looksNorwegian`, lik i `src/domain/language.ts` og `web.ts`). Norske schema.org-data brukes direkte (gratis); utenlandske sendes som tekst til Claude, som oversetter til bokmål, regner om amerikanske mål (cup → 2,4 dl, °F → °C osv., aldri volum → vekt) og lister omregningene i «uncertain». Bilder og innlimt tekst (ny modus `text`) følger samme regler. `translatedFrom` vises som «Oversatt fra …».
- **Begrunnelse:** Omregning er matematikk, ikke gjetting, men listes for kontroll. Norske kilder koster fortsatt ingenting.
