import { IonIcon, useIonRouter, useIonToast } from '@ionic/react'
import { alertCircleOutline, bookOutline, languageOutline } from 'ionicons/icons'
import { useState } from 'react'
import { ConflictError, saveRecipe } from '../data/store'
import { canSave, findIssues } from '../domain/validate'
import { BasicsFields, IngredientsEditor, IssueList, RecipePreview, StepsEditor, type Draft } from './editor'

/**
 * Kontroll og retting etter innliming eller bilde: alt foreslått innhold på én
 * side, med manglende informasjon tydelig markert, og forhåndsvisning av begge visningene.
 */
export function ReviewForm({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const issues = findIssues(draft)
  return (
    <div className="flex flex-col gap-10">
      <IssueList issues={issues} />
      <Section n={1} title="Grunninformasjon">
        <BasicsFields draft={draft} onChange={onChange} full />
      </Section>
      <Section n={2} title="Ingredienser">
        <IngredientsEditor ingredients={draft.ingredients} onChange={(ingredients) => onChange({ ...draft, ingredients })} />
      </Section>
      <Section n={3} title="Fremgangsmåte">
        <StepsEditor steps={draft.steps} ingredients={draft.ingredients} recipeTitle={draft.title} onChange={(steps) => onChange({ ...draft, steps })} />
      </Section>
      <Section n={4} title="Forhåndsvisning">
        <RecipePreview draft={draft} />
      </Section>
    </div>
  )
}

export function SaveButton({ draft, label = 'Lagre i kokeboka' }: { draft: Draft; label?: string }) {
  const router = useIonRouter()
  const [toast] = useIonToast()
  const [busy, setBusy] = useState(false)
  return (
    <button
      className="btn btn-primary min-h-14 flex-1 text-[1.05rem]"
      disabled={!canSave(draft) || busy}
      onClick={async () => {
        setBusy(true)
        try {
          const saved = await saveRecipe(draft)
          toast({ message: `«${saved.title}» er lagret i kokeboka`, duration: 2500, position: 'top' })
          // 'root': etter lagring skal «tilbake» gå til kokeboka, ikke tilbake gjennom skjemaet
          router.push(`/oppskrift/${saved.id}`, 'root', 'replace')
        } catch (e) {
          const message =
            e instanceof ConflictError
              ? 'Noen andre har endret oppskriften i mellomtiden. Åpne den på nytt og gjør endringen igjen.'
              : `Klarte ikke å lagre: ${(e as Error).message}`
          toast({ message, duration: 5000, position: 'top', color: 'danger' })
        } finally {
          setBusy(false)
        }
      }}
    >
      <IonIcon icon={bookOutline} aria-hidden className="text-xl" /> {busy ? 'Lagrer …' : label}
    </button>
  )
}

export function Section({ n, title, children }: { n?: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-3 text-[1.45rem] font-semibold">
        {n != null && <span className="grid size-8 place-items-center rounded-full bg-ink font-sans text-[0.95rem] font-bold text-paper">{n}</span>}
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Merknader fra automatisk lesing: oversettelse, omregnede mål og usikre ord. */
export function ReadNotes({ uncertain, translatedFrom }: { uncertain: string[]; translatedFrom?: string }) {
  if (!uncertain.length && !translatedFrom) return null
  return (
    <div className="flex flex-col gap-3">
      {translatedFrom && (
        <p className="flex items-center gap-2 rounded-2xl bg-sea-soft p-4 font-bold text-ink">
          <IonIcon icon={languageOutline} className="shrink-0 text-xl text-sea" aria-hidden />
          Oversatt fra {translatedFrom}. Sjekk at mengder og mål stemmer.
        </p>
      )}
      {uncertain.length > 0 && (
        <div className="missing rounded-2xl p-4">
          <p className="flex items-center gap-2 font-bold text-saffron">
            <IonIcon icon={alertCircleOutline} aria-hidden /> Sjekk dette:
          </p>
          <ul className="mt-1 list-disc pl-6 text-ink-2">
            {uncertain.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
