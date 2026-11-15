import { IonContent, IonIcon, IonPage, useIonRouter } from '@ionic/react'
import { add, searchOutline } from 'ionicons/icons'
import { useMemo, useState } from 'react'
import { MainHeader, TabBar } from '../components/AppChrome'
import { RecipeCard } from '../components/RecipeCard'
import { SectionTitle } from '../components/ui'
import { useFavorites, useFamily, useRecipes, useStore } from '../data/store'
import type { Recipe } from '../domain/types'

function normalize(s: string) {
  return s.toLowerCase().normalize('NFKD')
}

function matches(r: Recipe, q: string, members: Map<string, string>) {
  const hay = normalize(
    [r.title, r.description, r.origin, members.get(r.createdBy), ...r.categories, ...r.ingredients.map((i) => i.name)].filter(Boolean).join(' '),
  )
  return normalize(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

export default function HomePage() {
  const recipes = useRecipes()
  const family = useFamily()
  const mine = useFavorites()
  const allFavorites = useStore((s) => s.favorites)
  const router = useIonRouter()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const members = useMemo(() => new Map(family.members.map((m) => [m.id, m.name])), [family])
  const categories = useMemo(() => [...new Set(recipes.flatMap((r) => r.categories))].sort((a, b) => a.localeCompare(b, 'nb')), [recipes])

  // Familiens favoritter: favorisert av noen i familien, flest stjerner først
  const familyFavorites = useMemo(() => {
    const count = new Map<string, number>()
    Object.values(allFavorites).flat().forEach((id) => count.set(id, (count.get(id) ?? 0) + 1))
    return recipes.filter((r) => count.has(r.id)).sort((a, b) => count.get(b.id)! - count.get(a.id)!)
  }, [recipes, allFavorites])
  const recent = useMemo(() => [...recipes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [recipes])
  const all = useMemo(() => [...recipes].sort((a, b) => a.title.localeCompare(b.title, 'nb')), [recipes])

  const filtering = q.trim() !== '' || category !== null
  const results = filtering ? all.filter((r) => (!category || r.categories.includes(category)) && (!q.trim() || matches(r, q, members))) : []
  const isFav = (id: string) => mine.includes(id)

  return (
    <IonPage>
      <MainHeader />
      <IonContent>
        <div className="page-wrap flex flex-col gap-9 pt-2 pb-16">
          <section className="flex flex-col gap-4">
            <h1 className="max-w-[18ch] text-[2.1rem] leading-[1.05] font-semibold md:text-[2.8rem]">
              Hva skal vi lage <em className="font-medium whitespace-nowrap text-tomato">i dag?</em>
            </h1>
            <label className="relative block max-w-2xl">
              <span className="sr-only">Søk i oppskrifter</span>
              <IonIcon icon={searchOutline} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl text-ink-3" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Søk etter rett eller ingrediens …"
                className="field min-h-14 rounded-full pl-12 text-[1.05rem] shadow-[inset_0_0_0_1.5px_var(--color-line),var(--shadow-card)]"
              />
            </label>
            {categories.length > 0 && (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Kategorier">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(category === c ? null : c)}
                    aria-pressed={category === c}
                    className={`chip min-h-10 shrink-0 px-4 ${category === c ? 'bg-ink text-paper' : 'bg-card text-ink-2 ring-1 ring-line'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </section>

          {filtering ? (
            <section aria-live="polite">
              <SectionTitle>
                {results.length === 0 ? 'Ingen treff' : `${results.length} ${results.length === 1 ? 'oppskrift' : 'oppskrifter'}`}
              </SectionTitle>
              {results.length === 0 ? (
                <p className="text-ink-2">Prøv et annet ord – eller legg inn oppskriften selv.</p>
              ) : (
                <CardGrid recipes={results} isFav={isFav} />
              )}
            </section>
          ) : (
            <>
              {familyFavorites.length > 0 && (
                <section>
                  <SectionTitle>Familiens favoritter</SectionTitle>
                  <Rail recipes={familyFavorites} isFav={isFav} />
                </section>
              )}
              <section>
                <SectionTitle>Nylig lagt til</SectionTitle>
                <Rail recipes={recent} isFav={isFav} />
              </section>
              <section>
                <SectionTitle
                  action={
                    <button className="btn btn-secondary hidden min-h-10 md:inline-flex" onClick={() => router.push('/ny')}>
                      <IonIcon icon={add} aria-hidden /> Legg til
                    </button>
                  }
                >
                  Alle oppskrifter
                </SectionTitle>
                <CardGrid recipes={all} isFav={isFav} />
              </section>
              <AddPrompt onClick={() => router.push('/ny')} />
            </>
          )}
        </div>
      </IonContent>
      <TabBar />
    </IonPage>
  )
}

function Rail({ recipes, isFav }: { recipes: Recipe[]; isFav: (id: string) => boolean }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pt-1 pb-3 md:-mx-8 md:px-8">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} favorite={isFav(r.id)} variant="rail" />
      ))}
    </div>
  )
}

function CardGrid({ recipes, isFav }: { recipes: Recipe[]; isFav: (id: string) => boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} favorite={isFav(r.id)} />
      ))}
    </div>
  )
}

function AddPrompt({ onClick }: { onClick: () => void }) {
  return (
    <section className="gingham flex flex-col items-start gap-4 rounded-[var(--radius-card)] p-6 md:flex-row md:items-center md:p-8" style={{ ['--tone' as string]: 'var(--color-tomato)', ['--tone-bg' as string]: 'var(--color-tomato-soft)' }}>
      <div className="flex-1 rounded-2xl bg-card/90 p-4 backdrop-blur-sm md:bg-transparent md:p-0 md:backdrop-blur-none">
        <h2 className="text-[1.45rem] font-semibold">Har du en oppskrift i skuffen?</h2>
        <p className="mt-1 text-ink-2">Lim inn teksten, ta bilde av lappen eller skriv den inn – det tar et par minutter.</p>
      </div>
      <button className="btn btn-primary min-h-14 px-6 text-[1.05rem]" onClick={onClick}>
        <IonIcon icon={add} aria-hidden className="text-2xl" /> Legg til oppskrift
      </button>
    </section>
  )
}
