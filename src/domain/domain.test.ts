import { describe, expect, it } from 'vitest'
import { SEED_RECIPES } from '../data/seed'
import { buildGrid } from './grid'
import { extractStepMeta, guessAction } from './linker'
import { parseRecipeText } from './parseRecipeText'
import { formatAmount, parseIngredientLine } from './quantity'

const pasta = SEED_RECIPES.find((r) => r.id === 'r_kyllingpasta')!

describe('mengder', () => {
  it('tolker vanlige linjer', () => {
    expect(parseIngredientLine('400 g kyllingfilet, i terninger')).toMatchObject({ amount: 400, unit: 'g', name: 'kyllingfilet', note: 'i terninger' })
    expect(parseIngredientLine('1 1/2 dl melk')).toMatchObject({ amount: 1.5, unit: 'dl', name: 'melk' })
    expect(parseIngredientLine('1½ ts salt')).toMatchObject({ amount: 1.5, unit: 'ts' })
    expect(parseIngredientLine('2–3 fedd hvitløk')).toMatchObject({ amount: 2, amountMax: 3, unit: 'fedd', name: 'hvitløk' })
    expect(parseIngredientLine('0,5 l fløte')).toMatchObject({ amount: 0.5, unit: 'l' })
    expect(parseIngredientLine('3 egg')).toMatchObject({ amount: 3, unit: null, name: 'egg' })
    expect(parseIngredientLine('Salt og pepper')).toMatchObject({ amount: null, unit: null, name: 'Salt og pepper' })
  })
  it('formaterer og skalerer', () => {
    expect(formatAmount(0.5, null, 'dl')).toBe('½ dl')
    expect(formatAmount(0.5, null, 'dl', 3)).toBe('1½ dl')
    expect(formatAmount(400, null, 'g', 1.5)).toBe('600 g')
    expect(formatAmount(2, 3, 'fedd', 2)).toBe('4–6 fedd')
    expect(formatAmount(1.5, null, 'ts', 1 / 3)).toBe('½ ts')
    expect(formatAmount(null, null, null)).toBe('')
  })
})

describe('Recipe Grid', () => {
  const g = buildGrid(pasta)
  const cell = (id: string) => g.cells.find((c) => c.step.id === id)!
  it('gir kolonner etter dybde i prosessen', () => {
    expect(g.columns).toBe(5)
    expect(cell('s_kutt').col).toBe(1)
    expect(cell('s_stek').col).toBe(2)
    expect(cell('s_vend').col).toBe(5)
  })
  it('lar parallelle prosesser strekke seg til de slås sammen', () => {
    // Pastaen kokes i kolonne 1 og "venter" til den vendes inn i kolonne 5
    expect(cell('s_pasta')).toMatchObject({ col: 1, colEnd: 5 })
    expect(cell('s_riv')).toMatchObject({ col: 1, colEnd: 4 })
    expect(cell('s_pasta').track).not.toBe(cell('s_kutt').track)
  })
  it('gir sammenhengende rader per delprosess', () => {
    const stek = cell('s_stek')
    expect(stek.rowEnd - stek.rowStart).toBe(3) // kylling, hvitløk, olje
    expect(cell('s_vend')).toMatchObject({ rowStart: 0, rowEnd: pasta.ingredients.length })
    // Ingen celler i samme kolonne overlapper
    for (const a of g.cells) for (const b of g.cells) {
      if (a === b) continue
      const colOverlap = a.col < b.colEnd && b.col < a.colEnd
      const rowOverlap = a.rowStart < b.rowEnd && b.rowStart < a.rowEnd
      expect(colOverlap && rowOverlap, `${a.step.id} vs ${b.step.id}`).toBe(false)
    }
  })
  it('skiller ut forberedelsessteg', () => {
    const pizza = buildGrid(SEED_RECIPES.find((r) => r.id === 'r_pizzadeig')!)
    expect(pizza.prepSteps.map((p) => p.step.id)).toEqual(['p4'])
    expect(pizza.warnings).toEqual([])
  })
  it('alle eksempeloppskrifter gir gyldige rutenett uten advarsler', () => {
    for (const r of SEED_RECIPES) expect(buildGrid(r).warnings, r.title).toEqual([])
  })
})

describe('tolking av innlimt tekst', () => {
  const text = `Kremet kyllingpasta
Rask hverdagsmiddag.
4 porsjoner
Tid: 30 min

Ingredienser
400 g kyllingfilet
2 fedd hvitløk
2 dl fløte
50 g parmesan
300 g pasta
Salt og pepper

Fremgangsmåte
1. Skjær kyllingen i terninger.
2. Finhakk hvitløken.
3. Stek kyllingen og hvitløken i 5-7 minutter.
4. Hell i fløten og la det småkoke.
5. Riv parmesanen.
6. Rør inn parmesanen og smak til med salt og pepper.
7. Kok pastaen separat etter anvisning på pakken.
8. Vend pastaen inn i sausen.`

  const d = parseRecipeText(text)
  it('finner grunninformasjon', () => {
    expect(d.title).toBe('Kremet kyllingpasta')
    expect(d.description).toBe('Rask hverdagsmiddag.')
    expect(d.servings).toBe(4)
    expect(d.totalMinutes).toBe(30)
    expect(d.ingredients).toHaveLength(6)
    expect(d.steps).toHaveLength(8)
    expect(d.categories).toContain('Pasta')
  })
  it('gjetter ikke mengder som mangler', () => {
    expect(d.ingredients.find((i) => /salt/i.test(i.name))!.amount).toBeNull()
  })
  it('kobler ingredienser og steg så rutenettet blir riktig', () => {
    const [kutt, hakk, stek, flote, riv, rorinn, kok, vend] = d.steps
    const ingIds = (s: typeof kutt) => s.inputs.filter((i) => i.kind === 'ingredient').map((i) => d.ingredients.find((x) => x.id === i.id)!.name)
    const stepIds = (s: typeof kutt) => s.inputs.filter((i) => i.kind === 'step').map((i) => i.id)
    expect(ingIds(kutt)).toEqual(['kyllingfilet'])
    expect(ingIds(hakk)).toEqual(['hvitløk'])
    expect(stepIds(stek).sort()).toEqual([kutt.id, hakk.id].sort())
    expect(stepIds(flote)).toEqual([stek.id])
    expect(stepIds(riv)).toEqual([])
    expect(stepIds(rorinn).sort()).toEqual([flote.id, riv.id].sort())
    expect(stepIds(kok)).toEqual([])
    expect(stepIds(vend).sort()).toEqual([rorinn.id, kok.id].sort())
    expect(stek.durationMin).toBe(5)
    expect(stek.durationMaxMin).toBe(7)
    const grid = buildGrid({ ...pasta, ...d })
    expect(grid.warnings).toEqual([])
    expect(grid.columns).toBe(5)
  })
  it('fungerer uten overskrifter', () => {
    const d2 = parseRecipeText(`Pannekaker\n3 egg\n5 dl melk\n2,5 dl hvetemel\nVisp egg og melk sammen.\nVisp inn melet til en klumpfri røre.\nStek tynne pannekaker.`)
    expect(d2.title).toBe('Pannekaker')
    expect(d2.ingredients.map((i) => i.name)).toEqual(['egg', 'melk', 'hvetemel'])
    expect(d2.steps).toHaveLength(3)
  })
})

describe('handling, tid og temperatur', () => {
  it('finner handlingen', () => {
    expect(guessAction('Stek kyllingen i olje')).toBe('Stek')
    expect(guessAction('La småkoke i 10 min')).toBe('Småkok')
    expect(guessAction('Finhakk hvitløken')).toBe('Finhakk')
  })
  it('leser tid og temperatur', () => {
    expect(extractStepMeta('Bak i 10–12 minutter ved 200 grader')).toEqual({ durationMin: 10, durationMaxMin: 12, temperatureC: 200 })
    expect(extractStepMeta('Hev i 1 time')).toEqual({ durationMin: 60 })
    expect(extractStepMeta('Tilsett 2 ts salt')).toEqual({})
  })
})
