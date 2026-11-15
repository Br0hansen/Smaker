import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonToolbar,
  useIonRouter,
  useIonToast,
} from '@ionic/react'
import { createOutline, heart, heartOutline, peopleOutline, playCircle, timeOutline, timerOutline, documentAttachOutline, refreshOutline } from 'ionicons/icons'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ClassicView } from '../components/ClassicView'
import { GridView } from '../components/GridView'
import { Avatar, originMember, RecipeCover, Segmented, ServingsStepper } from '../components/ui'
import { loadVersions, memberName, restoreVersion, toggleFavorite, useFamily, useFavorites, useRecipe, useVersions } from '../data/store'
import { formatMinutes } from '../domain/quantity'
import { scaleFactor } from '../domain/validate'
import NotFoundPage from './NotFoundPage'

type View = 'classic' | 'grid'

export default function RecipePage() {
  const { id } = useParams()
  const recipe = useRecipe(id)
  const family = useFamily()
  const favorites = useFavorites()
  const versions = useVersions(id)
  const router = useIonRouter()
  const [toast] = useIonToast()
  const [view, setView] = useState<View>('classic')
  const [servings, setServings] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!recipe) return <NotFoundPage />

  const portions = servings ?? recipe.servings ?? 1
  const factor = scaleFactor(recipe.servings, portions)
  const fav = favorites.includes(recipe.id)
  const origin = originMember(family.members, recipe.origin, recipe.createdBy)
  const scans = recipe.attachments.filter((a) => a.kind === 'original-scan')

  return (
    <IonPage>
      <IonHeader className="ion-no-border" translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" text="Tilbake" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => toggleFavorite(recipe.id).catch(() => toast({ message: 'Klarte ikke å lagre favoritten', duration: 2500, position: 'top' }))} aria-label={fav ? 'Fjern fra favoritter' : 'Legg til i favoritter'} aria-pressed={fav}>
              <IonIcon slot="icon-only" icon={fav ? heart : heartOutline} className={fav ? 'text-tomato' : ''} />
            </IonButton>
            <IonButton onClick={() => { setHistoryOpen(true); void loadVersions(recipe.id) }} aria-label="Versjonshistorikk">
              <IonIcon slot="icon-only" icon={timerOutline} />
            </IonButton>
            <IonButton routerLink={`/oppskrift/${recipe.id}/rediger`} aria-label="Rediger oppskrift">
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="page-wrap pb-32">
          {/* Topp: omslag + tittel */}
          <header className="grid gap-6 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-end md:gap-10 md:pt-6">
            <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-card md:aspect-[5/4]">
              <RecipeCover recipe={recipe} large />
            </div>
            <div className="flex flex-col gap-4">
              {recipe.origin && (
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-card py-1 pr-3 pl-1 font-bold text-ink-2 shadow-card">
                  <Avatar member={origin} size="sm" /> Fra {recipe.origin}
                </span>
              )}
              <h1 className="text-[2.3rem] leading-[1.05] font-semibold md:text-[3.2rem]">{recipe.title}</h1>
              {recipe.description && <p className="text-[1.1rem] text-ink-2">{recipe.description}</p>}
              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 self-start font-bold text-sea underline underline-offset-4">
                  Kilde: {(() => { try { return new URL(recipe.sourceUrl).hostname.replace(/^www\./, '') } catch { return recipe.sourceUrl } })()} ↗
                </a>
              )}
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-ink-2">
                {recipe.totalMinutes != null && (
                  <div className="flex items-center gap-2">
                    <IonIcon icon={timeOutline} aria-hidden className="text-xl" />
                    <dt className="sr-only">Total tid</dt>
                    <dd>
                      <strong className="text-ink">{formatMinutes(recipe.totalMinutes)}</strong>
                      {recipe.prepMinutes != null && <span> · {formatMinutes(recipe.prepMinutes)} aktivt</span>}
                    </dd>
                  </div>
                )}
                {recipe.servings == null && (
                  <div className="flex items-center gap-2">
                    <IonIcon icon={peopleOutline} aria-hidden className="text-xl" />
                    <dd>Porsjoner ikke oppgitt</dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-wrap items-center gap-3">
                {recipe.servings != null && <ServingsStepper value={portions} onChange={setServings} unit={recipe.servingsUnit ?? 'porsjoner'} />}
                <button
                  className="btn btn-primary hidden min-h-12 md:inline-flex"
                  onClick={() => router.push(`/oppskrift/${recipe.id}/lag?porsjoner=${portions}`)}
                >
                  <IonIcon icon={playCircle} aria-hidden className="text-2xl" /> Start matlaging
                </button>
              </div>
            </div>
          </header>

          {recipe.story && (
            <figure className="relative mt-8 max-w-3xl rounded-[var(--radius-card)] bg-saffron-soft/60 px-6 py-5 md:px-8">
              <span aria-hidden className="absolute -top-5 left-4 font-display text-7xl leading-none text-saffron/50">“</span>
              <blockquote className="font-display text-[1.25rem] leading-snug italic text-ink">{recipe.story}</blockquote>
              {recipe.origin && <figcaption className="mt-2 font-bold text-ink-2">— om {recipe.origin}</figcaption>}
            </figure>
          )}

          <div className="sticky top-0 z-20 -mx-4 mt-8 mb-6 flex items-center justify-between gap-3 bg-paper/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
            <Segmented<View>
              label="Visning av oppskriften"
              value={view}
              onChange={setView}
              options={[
                { value: 'classic', label: 'Oppskrift' },
                { value: 'grid', label: 'Recipe Grid' },
              ]}
            />
            {factor !== 1 && <span className="chip bg-butter/60 text-ink">Mengder × {Math.round(factor * 100) / 100}</span>}
          </div>

          {view === 'classic' ? <ClassicView recipe={recipe} factor={factor} /> : <GridView recipe={recipe} factor={factor} />}

          {scans.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 flex items-center gap-2 text-[1.45rem] font-semibold">
                <IonIcon icon={documentAttachOutline} aria-hidden /> Originalen
              </h2>
              <div className="flex flex-wrap gap-4">
                {scans.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block w-48 overflow-hidden rounded-xl bg-card shadow-card">
                    <img src={a.url} alt={a.caption ?? 'Bilde av originaloppskriften'} className="aspect-[3/4] w-full object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-12 border-t border-dashed border-line pt-4 text-[0.9rem] text-ink-3">
            Lagt inn av {memberName(family, recipe.createdBy)} {new Date(recipe.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
            {recipe.version > 1 && <> · sist endret av {memberName(family, recipe.updatedBy)} (versjon {recipe.version})</>}
          </footer>
        </div>

        <IonModal isOpen={historyOpen} onDidDismiss={() => setHistoryOpen(false)} initialBreakpoint={0.6} breakpoints={[0, 0.6, 0.95]}>
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-[1.45rem] font-semibold">Versjoner</h2>
            <p className="text-ink-2">Har noen endret noe ved en feil? Gjenopprett en tidligere versjon – ingenting blir slettet.</p>
            {versions.length === 0 && <p className="text-ink-3">Henter versjoner …</p>}
            <ol className="flex flex-col divide-y divide-line">
              {[...versions].reverse().map((v) => (
                <li key={v.version} className="flex items-center gap-3 py-3">
                  <Avatar member={family.members.find((m) => m.id === v.savedBy)} size="sm" />
                  <div className="flex-1">
                    <div className="font-bold">Versjon {v.version}{v.version === recipe.version && ' · nåværende'}</div>
                    <div className="text-[0.88rem] text-ink-3">
                      {memberName(family, v.savedBy)}, {new Date(v.savedAt).toLocaleString('nb-NO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  {v.version !== recipe.version && (
                    <button
                      className="btn btn-secondary min-h-10 px-4 text-[0.9rem]"
                      onClick={async () => {
                        try {
                          await restoreVersion(recipe.id, v.version)
                          setHistoryOpen(false)
                          toast({ message: `Versjon ${v.version} er gjenopprettet`, duration: 2500, position: 'top' })
                        } catch (e) {
                          toast({ message: `Klarte ikke å gjenopprette: ${(e as Error).message}`, duration: 4000, position: 'top', color: 'danger' })
                        }
                      }}
                    >
                      <IonIcon icon={refreshOutline} aria-hidden /> Gjenopprett
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </IonModal>
      </IonContent>

      {/* Mobil: stor knapp alltid innen rekkevidde */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:hidden">
        <button
          className="btn btn-primary pointer-events-auto min-h-14 w-full text-[1.1rem]"
          onClick={() => router.push(`/oppskrift/${recipe.id}/lag?porsjoner=${portions}`)}
        >
          <IonIcon icon={playCircle} aria-hidden className="text-2xl" /> Start matlaging
        </button>
      </div>
    </IonPage>
  )
}
