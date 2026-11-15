import { describe, expect, it } from 'vitest'
import { stepsFromSuggestion } from './fromAiRead'
import { draftFromWebRecipe, parseYield } from './fromWebRecipe'
import { newId } from './ids'

describe('oppskrift fra nettside (schema.org)', () => {
  const d = draftFromWebRecipe({
    name: 'Kremet kyllingpasta',
    description: 'Rask middag',
    ingredients: ['400 g kyllingfilet', '2 fedd hvitløk', '2 dl matfløte', '300 g pasta'],
    instructions: ['Skjær kyllingen i terninger.', 'Stek kyllingen med hvitløk i 5 minutter.', 'Hell i fløten.', 'Kok pastaen separat og vend den inn i sausen.'],
    yield: '4 porsjoner',
    totalMinutes: 30,
    prepMinutes: 10,
    categories: ['Middag'],
    image: 'https://eks.no/bilde.jpg',
  })
  it('tolker ingredienser, porsjoner og tid', () => {
    expect(d.ingredients[0]).toMatchObject({ amount: 400, unit: 'g', name: 'kyllingfilet' })
    expect(d).toMatchObject({ servings: 4, servingsUnit: 'porsjoner', totalMinutes: 30, coverImage: 'https://eks.no/bilde.jpg' })
  })
  it('kobler stegene automatisk og leser tid fra teksten', () => {
    expect(d.steps).toHaveLength(4)
    expect(d.steps[1].durationMin).toBe(5)
    expect(d.steps[0].inputs.some((i) => i.kind === 'ingredient')).toBe(true)
  })
  it('porsjonsuttrykk', () => {
    expect(parseYield('Gir 12 boller')).toEqual({ servings: 12, unit: 'boller' })
    expect(parseYield('4')).toEqual({ servings: 4, unit: 'porsjoner' })
    expect(parseYield('4-6 servings')).toEqual({ servings: 4, unit: 'porsjoner' })
    expect(parseYield(null)).toEqual({ servings: null })
  })
})

describe('foreslått fremgangsmåte', () => {
  const ings = [
    { id: newId(), name: 'pasta', amount: 300, unit: 'g' },
    { id: newId(), name: 'fløte', amount: 2, unit: 'dl' },
  ]
  const steps = stepsFromSuggestion(
    [
      { text: 'Kok pastaen.', action: 'Kok', ingredientIndexes: [0], buildsOnSteps: [], produces: null, durationMin: 10, durationMaxMin: null, temperatureC: 200 },
      { text: 'Vend inn fløten.', action: 'Vend inn', ingredientIndexes: [1], buildsOnSteps: [0], produces: null, durationMin: null, durationMaxMin: null, temperatureC: null },
    ],
    ings,
  )
  it('merker stegene som forslag', () => {
    expect(steps.every((s) => s.suggested === true)).toBe(true)
  })
  it('kobler til eksisterende ingredienser og tidligere steg', () => {
    expect(steps[0].inputs).toEqual([{ kind: 'ingredient', id: ings[0].id }])
    expect(steps[1].inputs).toEqual([{ kind: 'step', id: steps[0].id }, { kind: 'ingredient', id: ings[1].id }])
  })
  it('gjetter aldri tider eller temperaturer', () => {
    expect(steps[0]).toMatchObject({ durationMin: null, temperatureC: null })
  })
})
