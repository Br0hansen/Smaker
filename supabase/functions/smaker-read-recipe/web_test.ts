import { assert, assertEquals } from 'jsr:@std/assert@1'
import { blockedHost, decodeEntities, isoMinutes, pageText, structuredRecipe } from './web.ts'

const page = (ld: unknown, extra = '') => `<!doctype html><html><head><title>Side</title>
<script type="application/ld+json">${JSON.stringify(ld)}</script>${extra}</head><body><p>Hei</p></body></html>`

Deno.test('leser schema.org/Recipe i @graph med seksjoner', () => {
  const r = structuredRecipe(page({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'Side' },
      {
        '@type': ['Recipe'],
        name: 'Vafler &amp; syltetøy',
        description: '<p>Myke vafler</p>',
        recipeIngredient: ['3 egg', '5 dl melk', '1&frac12; dl sukker'],
        recipeInstructions: [
          { '@type': 'HowToSection', name: 'Røre', itemListElement: [{ '@type': 'HowToStep', text: 'Pisk egg og sukker.' }, { '@type': 'HowToStep', text: 'Rør inn melk.' }] },
          { '@type': 'HowToStep', text: 'Stek vaflene.' },
        ],
        recipeYield: ['10', '10 vafler'],
        prepTime: 'PT10M',
        cookTime: 'PT30M',
        recipeCategory: 'Bakst',
        image: [{ '@type': 'ImageObject', url: 'https://eks.no/vafler.jpg' }],
      },
    ],
  }))!
  assertEquals(r.name, 'Vafler & syltetøy')
  assertEquals(r.description, 'Myke vafler')
  assertEquals(r.ingredients, ['3 egg', '5 dl melk', '1½ dl sukker'])
  assertEquals(r.instructions, ['Pisk egg og sukker.', 'Rør inn melk.', 'Stek vaflene.'])
  assertEquals(r.yield, '10')
  assertEquals(r.totalMinutes, 40)
  assertEquals(r.prepMinutes, 10)
  assertEquals(r.categories, ['Bakst'])
  assertEquals(r.image, 'https://eks.no/vafler.jpg')
})

Deno.test('fremgangsmåte som én tekst deles i steg', () => {
  const r = structuredRecipe(page({ '@type': 'Recipe', name: 'X', recipeIngredient: ['1 egg'], recipeInstructions: 'Pisk egget.<br>Stek det.' }))!
  assertEquals(r.instructions, ['Pisk egget.', 'Stek det.'])
})

Deno.test('ingen oppskriftsdata → null (Claude tar over)', () => {
  assertEquals(structuredRecipe(page({ '@type': 'Article', name: 'Nyhet' })), null)
  assertEquals(structuredRecipe('<html><body>ingen data</body></html>'), null)
})

Deno.test('ISO 8601-varighet', () => {
  assertEquals(isoMinutes('PT1H30M'), 90)
  assertEquals(isoMinutes('P1DT2H'), 1560)
  assertEquals(isoMinutes('PT0M'), null)
  assertEquals(isoMinutes('ukjent'), null)
})

Deno.test('HTML-tegn', () => {
  assertEquals(decodeEntities('R&oslash;mme &amp; 200&deg; &#8211; &#x2013;'), 'Rømme & 200° – –')
})

Deno.test('tekst fra sider uten strukturerte data (f.eks. TikTok)', () => {
  const html = `<html><head><meta property="og:title" content="Kremet pasta"><meta property="og:description" content="Du trenger: 300 g pasta, 2 dl fløte #pasta"></head>
  <body><nav>Meny Logg inn</nav><script>var x = 1</script><p>Ingrediensliste</p><ul><li>300 g pasta</li><li>2 dl fløte</li></ul><footer>© 2026</footer></body></html>`
  const t = pageText(html)
  assert(t.includes('Tittel: Kremet pasta'))
  assert(t.includes('Du trenger: 300 g pasta'))
  assert(t.includes('• 300 g pasta'))
  assert(!t.includes('Meny Logg inn'))
  assert(!t.includes('var x'))
})

Deno.test('blokkerer interne adresser', () => {
  for (const h of ['localhost', '127.0.0.1', '10.0.0.5', '192.168.1.1', '172.20.0.1', '169.254.169.254', '[::1]', 'printer.local', 'intranett']) {
    assert(blockedHost(h), h)
  }
  for (const h of ['www.matprat.no', 'www.tiktok.com', '8.8.8.8']) assert(!blockedHost(h), h)
})

import { isNorwegianRecipe, pageLanguage, recipeAsText } from './web.ts'

Deno.test('språk: språkmerke avgjør, ellers ordtest', () => {
  const r = { name: 'Pancakes', description: null, ingredients: ['2 cups flour', '1 tbsp sugar', '1 cup milk', '2 eggs'], instructions: ['Whisk the eggs and milk.', 'Add flour and sugar and mix until smooth.', 'Bake in a hot pan.'], yield: '4', totalMinutes: 20, prepMinutes: null, categories: [], image: null }
  assertEquals(pageLanguage('<html lang="en-US"><head>'), 'en')
  assertEquals(isNorwegianRecipe(r, '<html lang="en-US">'), false)
  assertEquals(isNorwegianRecipe(r, '<html>'), false)
  const n = { ...r, name: 'Pannekaker', ingredients: ['2,5 dl hvetemel', '1 ss sukker', '5 dl melk', '3 egg'], instructions: ['Pisk egg og melk.', 'Rør inn mel og sukker til en klumpfri røre.', 'Stek tynne pannekaker i smør.'] }
  assertEquals(isNorwegianRecipe(n, '<html lang="nb">'), true)
  assertEquals(isNorwegianRecipe(n, '<html>'), true)
  assertEquals(isNorwegianRecipe(n, '<html lang="sv">'), false) // svensk side → oversettes
  assert(recipeAsText(r).includes('- 2 cups flour'))
  assert(recipeAsText(r).includes('2. Add flour and sugar'))
})
