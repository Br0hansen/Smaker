import { describe, expect, it } from 'vitest'
import { buildGrid } from './grid'
import { draftFromAiRead, type AiRecipeRead } from './fromAiRead'
import { isUuid } from './ids'

const base: AiRecipeRead = {
  isRecipe: true,
  title: 'Bestemors vafler',
  description: null,
  servings: 10,
  servingsUnit: 'vafler',
  totalMinutes: null,
  prepMinutes: null,
  categories: ['Bakst', 'Bakst', ' '],
  ingredients: [
    { name: 'egg', amount: 3, amountMax: null, unit: null, note: null, group: null },
    { name: 'sukker', amount: 0.5, amountMax: null, unit: 'dl', note: null, group: null },
    { name: '', amount: null, amountMax: null, unit: null, note: null, group: null }, // tom rad
    { name: 'hvetemel', amount: 5, amountMax: null, unit: 'Spiseskje', note: null, group: null },
    { name: 'melk', amount: 2, amountMax: 3, unit: 'kopp', note: 'kald', group: null },
  ],
  steps: [
    { text: 'Pisk egg og sukker.', action: 'Pisk', ingredientIndexes: [0, 1], buildsOnSteps: [], produces: 'Eggedosis', durationMin: null, durationMaxMin: null, temperatureC: null },
    { text: 'Rør inn mel og melk.', action: '', ingredientIndexes: [3, 4, 99], buildsOnSteps: [0, 1, 5], produces: null, durationMin: 15, durationMaxMin: 10, temperatureC: null },
  ],
  uncertain: ['«kopp» – gammel enhet'],
}

describe('svar fra bildemodellen → utkast', () => {
  const d = draftFromAiRead(base)
  it('gir UUID-er og hopper over tomme rader', () => {
    expect(d.ingredients).toHaveLength(4)
    expect(d.ingredients.every((i) => isUuid(i.id))).toBe(true)
    expect(d.steps.every((s) => isUuid(s.id))).toBe(true)
  })
  it('kobler riktige ingredienser selv når en tom rad er fjernet', () => {
    const names = (i: number) => d.steps[i].inputs.filter((x) => x.kind === 'ingredient').map((x) => d.ingredients.find((g) => g.id === x.id)!.name)
    expect(names(0)).toEqual(['egg', 'sukker'])
    expect(names(1)).toEqual(['hvetemel', 'melk']) // indeks 99 finnes ikke – droppes
  })
  it('lar bare et steg bygge på tidligere steg', () => {
    expect(d.steps[1].inputs.filter((x) => x.kind === 'step').map((x) => x.id)).toEqual([d.steps[0].id])
  })
  it('normaliserer kjente enheter og beholder ukjente', () => {
    expect(d.ingredients.find((i) => i.name === 'hvetemel')!.unit).toBe('ss')
    expect(d.ingredients.find((i) => i.name === 'melk')).toMatchObject({ unit: 'kopp', amount: 2, amountMax: 3, note: 'kald' })
  })
  it('rydder i tider, handling og kategorier – og finner ikke på noe', () => {
    expect(d.steps[1].action).toBe('Rør') // tom handling → gjettet fra teksten
    expect(d.steps[1]).toMatchObject({ durationMin: 15, durationMaxMin: null })
    expect(d.categories).toEqual(['Bakst'])
    expect(d.totalMinutes).toBeNull()
  })
  it('gir et gyldig rutenett', () => {
    const g = buildGrid({ ...d, id: 'x', familyId: 'f', attachments: [], createdBy: '', createdAt: '', updatedBy: '', updatedAt: '', version: 1 })
    expect(g.warnings).toEqual([])
  })
  it('bruker automatisk kobling når modellen ikke koblet noe', () => {
    const d2 = draftFromAiRead({ ...base, steps: base.steps.map((s) => ({ ...s, ingredientIndexes: [], buildsOnSteps: [] })) })
    expect(d2.steps[0].inputs.length).toBeGreaterThan(0)
  })
})
