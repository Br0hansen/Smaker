/**
 * Eksempeldata, så appen har innhold før Supabase er koblet på.
 * Grafen (inputs) er skrevet for hånd – det er slik en ferdig korrigert
 * oppskrift ser ut i databasen.
 */
import type { Family, Ingredient, Recipe, Step } from '../domain/types'

export const SEED_FAMILY: Family = {
  id: 'fam_demo',
  name: 'Familien vår',
  members: [
    { id: 'm_meg', name: 'Meg', role: 'owner', color: '#B8532F' },
    { id: 'm_mamma', name: 'Mamma', role: 'admin', color: '#5E7F62' },
    { id: 'm_pappa', name: 'Pappa', role: 'member', color: '#C98A2B' },
    { id: 'm_bestemor', name: 'Bestemor', role: 'member', color: '#7A5C8A' },
  ],
}

export const CURRENT_MEMBER_ID = 'm_meg'

const ing = (id: string, amount: number | null, unit: string | null, name: string, extra: Partial<Ingredient> = {}): Ingredient => ({
  id, amount, unit, name, ...extra,
})
const I = (id: string) => ({ kind: 'ingredient' as const, id })
const S = (id: string) => ({ kind: 'step' as const, id })
const step = (id: string, action: string, text: string, inputs: Step['inputs'], extra: Partial<Step> = {}): Step => ({
  id, action, text, inputs, ...extra,
})

const base = {
  familyId: SEED_FAMILY.id,
  attachments: [],
  version: 1,
}

export const SEED_RECIPES: Recipe[] = [
  {
    ...base,
    id: 'r_kyllingpasta',
    title: 'Kremet kyllingpasta',
    description: 'Rask hverdagsmiddag med hvitløk og parmesan. Pastaen koker mens sausen lages.',
    origin: 'Pappa',
    servings: 4,
    totalMinutes: 30,
    prepMinutes: 10,
    categories: ['Pasta', 'Kylling', 'Hverdag'],
    ingredients: [
      ing('i_kylling', 400, 'g', 'kyllingfilet'),
      ing('i_hvitlok', 2, 'fedd', 'hvitløk'),
      ing('i_olje', 1, 'ss', 'olje'),
      ing('i_flote', 2, 'dl', 'matfløte'),
      ing('i_parmesan', 50, 'g', 'parmesan'),
      ing('i_salt', null, null, 'salt og pepper'),
      ing('i_pasta', 300, 'g', 'pasta', { note: 'f.eks. penne' }),
    ],
    steps: [
      step('s_kutt', 'Kutt', 'Skjær kyllingen i terninger på ca. 2 cm.', [I('i_kylling')]),
      step('s_hakk', 'Finhakk', 'Finhakk hvitløken.', [I('i_hvitlok')]),
      step('s_stek', 'Stek', 'Stek kyllingen i olje på middels høy varme i 5–7 minutter. Ha i hvitløken det siste minuttet.', [S('s_kutt'), S('s_hakk'), I('i_olje')], { durationMin: 5, durationMaxMin: 7 }),
      step('s_flote', 'Tilsett', 'Hell i fløten og la det småkoke i 3 minutter.', [S('s_stek'), I('i_flote')], { durationMin: 3, produces: 'Saus' }),
      step('s_riv', 'Riv', 'Riv parmesanen.', [I('i_parmesan')]),
      step('s_rorinn', 'Rør inn', 'Rør parmesanen inn i sausen, og smak til med salt og pepper.', [S('s_flote'), S('s_riv'), I('i_salt')]),
      step('s_pasta', 'Kok', 'Kok pastaen separat i godt saltet vann etter anvisningen på pakken.', [I('i_pasta')], { produces: 'Pasta' }),
      step('s_vend', 'Vend inn', 'Vend pastaen inn i sausen og server med en gang.', [S('s_rorinn'), S('s_pasta')]),
    ],
    createdBy: 'm_pappa',
    createdAt: '2026-11-10T17:20:00Z',
    updatedBy: 'm_pappa',
    updatedAt: '2026-11-10T17:20:00Z',
  },
  {
    ...base,
    id: 'r_vafler',
    title: 'Bestemors vafler',
    description: 'Myke, gyldne vafler med kardemomme.',
    story: 'Bestemor stekte disse hver søndag på hytta. Røren skal hvile litt – «da blir de møre», sa hun alltid.',
    origin: 'Bestemor',
    servings: 10,
    servingsUnit: 'vafler',
    totalMinutes: 40,
    prepMinutes: 10,
    categories: ['Bakst', 'Søndag'],
    ingredients: [
      ing('v_smor', 100, 'g', 'smør'),
      ing('v_egg', 3, null, 'egg'),
      ing('v_sukker', 0.5, 'dl', 'sukker'),
      ing('v_mel', 5, 'dl', 'hvetemel'),
      ing('v_bakepulver', 1, 'ts', 'bakepulver'),
      ing('v_kardemomme', 1, 'ts', 'kardemomme', { note: 'malt' }),
      ing('v_melk', 5, 'dl', 'melk'),
    ],
    steps: [
      step('v1', 'Smelt', 'Smelt smøret og la det avkjøle litt.', [I('v_smor')]),
      step('v2', 'Pisk', 'Pisk egg og sukker luftig.', [I('v_egg'), I('v_sukker')]),
      step('v3', 'Bland', 'Bland mel, bakepulver og kardemomme i en egen bolle.', [I('v_mel'), I('v_bakepulver'), I('v_kardemomme')]),
      step('v4', 'Rør inn', 'Rør melblandingen og melken vekselvis inn i eggedosisen til en klumpfri røre.', [S('v2'), S('v3'), I('v_melk')]),
      step('v5', 'Hvil', 'Rør inn det smeltede smøret. La røren hvile i 15 minutter.', [S('v4'), S('v1')], { durationMin: 15, produces: 'Vaffelrøre' }),
      step('v6', 'Stek', 'Stek vaflene gylne i et varmt, smurt vaffeljern.', [S('v5')]),
    ],
    createdBy: 'm_mamma',
    createdAt: '2026-10-02T09:00:00Z',
    updatedBy: 'm_mamma',
    updatedAt: '2026-10-02T09:00:00Z',
  },
  {
    ...base,
    id: 'r_kjottkaker',
    title: 'Mammas kjøttkaker',
    description: 'Hjemmelagde kjøttkaker i brun saus.',
    story: 'Serveres med potetstappe, ertestuing og tyttebær. Mamma lager alltid dobbel porsjon og fryser halvparten.',
    origin: 'Mamma',
    servings: 4,
    totalMinutes: 60,
    prepMinutes: 25,
    categories: ['Kjøtt', 'Middag'],
    ingredients: [
      ing('k_lok', 1, null, 'løk'),
      ing('k_kjott', 600, 'g', 'kjøttdeig', { note: 'storfe' }),
      ing('k_salt', 1.5, 'ts', 'salt'),
      ing('k_pepper', 0.25, 'ts', 'pepper'),
      ing('k_muskat', 0.5, 'ts', 'muskat'),
      ing('k_potetmel', 2, 'ss', 'potetmel'),
      ing('k_melk', 3, 'dl', 'melk'),
      ing('k_stekesmor', null, null, 'smør til steking'),
      ing('k_smor', 3, 'ss', 'smør', { group: 'Til sausen' }),
      ing('k_mel', 3, 'ss', 'hvetemel', { group: 'Til sausen' }),
      ing('k_kraft', 6, 'dl', 'kjøttkraft', { group: 'Til sausen' }),
    ],
    steps: [
      step('k1', 'Riv', 'Riv løken fint.', [I('k_lok')]),
      step('k2', 'Elt', 'Elt kjøttdeigen med salt til en seig farse.', [I('k_kjott'), I('k_salt')]),
      step('k3', 'Spe', 'Tilsett pepper, muskat, potetmel og løk. Spe med melken litt etter litt.', [S('k2'), S('k1'), I('k_pepper'), I('k_muskat'), I('k_potetmel'), I('k_melk')], { produces: 'Farse' }),
      step('k4', 'Form og brun', 'Form kjøttkaker med en våt skje og brun dem i smør.', [S('k3'), I('k_stekesmor')], { produces: 'Kjøttkaker' }),
      step('k5', 'Brun', 'Brun smør og mel til en nøttebrun jevning.', [I('k_smor'), I('k_mel')]),
      step('k6', 'Spe', 'Spe med kraften under omrøring og kok opp.', [S('k5'), I('k_kraft')], { produces: 'Brun saus' }),
      step('k7', 'Småkok', 'Legg kjøttkakene i sausen og la dem småkoke under lokk i 15 minutter.', [S('k4'), S('k6')], { durationMin: 15 }),
    ],
    createdBy: 'm_mamma',
    createdAt: '2026-09-14T15:30:00Z',
    updatedBy: 'm_mamma',
    updatedAt: '2026-09-14T15:30:00Z',
  },
  {
    ...base,
    id: 'r_pizzadeig',
    title: 'Pappas pizzadeig',
    description: 'Fredagspizza med sprø, tynn bunn.',
    story: 'Pappa sverger til lang elting. «Ti minutter – ikke jukse!»',
    origin: 'Pappa',
    servings: 2,
    servingsUnit: 'pizzaer',
    totalMinutes: 90,
    prepMinutes: 20,
    categories: ['Pizza', 'Bakst', 'Fredag'],
    ingredients: [
      ing('p_gjaer', 25, 'g', 'gjær', { note: 'fersk' }),
      ing('p_vann', 3, 'dl', 'lunkent vann'),
      ing('p_salt', 1, 'ts', 'salt'),
      ing('p_olje', 2, 'ss', 'olivenolje'),
      ing('p_mel', 7, 'dl', 'hvetemel', { amountMax: 8 }),
    ],
    steps: [
      step('p1', 'Løs opp', 'Løs opp gjæren i det lunkne vannet.', [I('p_gjaer'), I('p_vann')]),
      step('p2', 'Elt', 'Tilsett salt, olje og mesteparten av melet. Elt deigen smidig i 10 minutter.', [S('p1'), I('p_salt'), I('p_olje'), I('p_mel')], { durationMin: 10 }),
      step('p3', 'Hev', 'La deigen heve tildekket i 45 minutter.', [S('p2')], { durationMin: 45, produces: 'Pizzadeig' }),
      step('p4', 'Forvarm', 'Forvarm ovnen til 250 °C.', [], { temperatureC: 250 }),
      step('p5', 'Kjevle', 'Del deigen i to og kjevle ut tynne bunner.', [S('p3')]),
      step('p6', 'Bak', 'Ha på fyll og bak pizzaene midt i ovnen i 10–12 minutter.', [S('p5')], { durationMin: 10, durationMaxMin: 12, temperatureC: 250 }),
    ],
    createdBy: 'm_meg',
    createdAt: '2026-11-13T18:00:00Z',
    updatedBy: 'm_meg',
    updatedAt: '2026-11-13T18:00:00Z',
  },
]

export const SEED_FAVORITES: Record<string, string[]> = {
  m_meg: ['r_vafler', 'r_kjottkaker'],
}
