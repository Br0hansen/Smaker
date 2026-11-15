---
title: Recipe Grid
tags: [smaker, recipe-grid, feature]
created: 2026-11-15
updated: 2026-11-15
status: active
type: permanent
---

# Recipe Grid

Beregnes i `src/domain/grid.ts` (`buildGrid`) fra grafen i [[datamodell]]. Ingenting om layout lagres. Se også [[decisions]].

## Algoritme
1. Rens input: et steg kan bare bruke tidligere steg (hindrer sirkler).
2. Hver ingrediens «eies» av første steg som bruker den. Senere bruk vises som «+ salt» i cellen.
3. Forberedelsessteg = steg uten ingredienser i hele undertreet (f.eks. «Forvarm ovnen») – vises som chips over rutenettet.
4. Ett steg skal ha én mottaker. Flere mottakere gir advarsel.
5. Kolonne = 1 + dypeste barn. Ingredienser er kolonne 0.
6. Rader: dybde-først fra hvert sluttresultat, i input-rekkefølge → sammenhengende rader per delprosess.
7. Celle strekker seg til mottakerens kolonne (`colEnd`). Første kolonne = arbeid, resten stripet = venter/parallelt.
8. Spor (farge): arver første barns spor; nye grener får nytt.

## Visning
- Stor skjerm: fullt rutenett + fokuspanel ved siden av.
- Mobil: kompakt rutenett som passer bredden, ELLER steg-for-steg med minikart. Aldri panorering.
- Testene i `src/domain/domain.test.ts` sjekker at ingen celler overlapper.
