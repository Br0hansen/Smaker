import { IonIcon } from '@ionic/react'
import { chevronBack, chevronForward } from 'ionicons/icons'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BasicsFields, emptyDraft, IngredientsEditor, IssueList, RecipePreview, StepsEditor, type Draft } from '../components/editor'
import { FormPage } from '../components/FormPage'
import { SaveButton } from '../components/ReviewForm'
import { useRecipe } from '../data/store'
import { autoLink } from '../domain/linker'
import { findIssues } from '../domain/validate'

const STEPS = ['Grunninfo', 'Ingredienser', 'Fremgangsmåte', 'Lagre'] as const

export default function ManualWizardPage() {
  const { id } = useParams()
  const existing = useRecipe(id)
  const editing = !!existing
  const [draft, setDraft] = useState<Draft>(() => {
    if (!existing) return emptyDraft()
    const { familyId: _f, createdBy: _c, createdAt: _ca, updatedBy: _u, updatedAt: _ua, version: _v, ...rest } = existing
    return rest
  })
  const [page, setPage] = useState(0)

  const goTo = (p: number) => {
    // Første gang vi kommer til fremgangsmåten med ingredienser men uten koblinger: foreslå koblinger
    if (p === 2 && draft.steps.length > 0 && draft.steps.every((s) => s.inputs.length === 0)) {
      const linked = autoLink(draft.ingredients, draft.steps)
      setDraft({ ...draft, steps: draft.steps.map((s, i) => ({ ...s, inputs: linked[i].inputs })) })
    }
    setPage(p)
  }

  const footer = (
    <>
      <button className="btn btn-secondary min-h-14 px-5" onClick={() => goTo(page - 1)} disabled={page === 0} aria-label="Forrige">
        <IonIcon icon={chevronBack} className="text-xl" /> <span className="hidden sm:inline">Forrige</span>
      </button>
      {page < STEPS.length - 1 ? (
        <button className="btn btn-primary min-h-14 flex-1 text-[1.05rem]" onClick={() => goTo(page + 1)} disabled={page === 0 && !draft.title.trim()}>
          Neste: {STEPS[page + 1]} <IonIcon icon={chevronForward} className="text-xl" aria-hidden />
        </button>
      ) : (
        <SaveButton draft={draft} label={editing ? 'Lagre endringene' : 'Lagre i kokeboka'} />
      )}
    </>
  )

  return (
    <FormPage title={editing ? 'Rediger' : 'Skriv selv'} back={editing ? `/oppskrift/${id}` : '/ny'} footer={footer}>
      {/* Fremdrift */}
      <ol className="mt-2 mb-8 grid grid-cols-4 gap-2" aria-label="Steg i veiviseren">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button onClick={() => (i === 0 || draft.title.trim()) && goTo(i)} className="flex w-full flex-col gap-1.5 text-left" aria-current={i === page ? 'step' : undefined}>
              <span className={`h-1.5 rounded-full ${i <= page ? 'bg-tomato' : 'bg-line'}`} />
              <span className={`hidden text-[0.8rem] font-bold sm:block ${i === page ? 'text-ink' : 'text-ink-3'}`}>
                {i + 1}. {label}
              </span>
              <span className="sr-only sm:hidden">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="-mt-5 mb-6 text-[0.85rem] font-bold text-ink-3 sm:hidden">
        Steg {page + 1} av {STEPS.length} · {STEPS[page]}
      </p>

      {page === 0 && (
        <Step title={editing ? draft.title || 'Rediger oppskriften' : 'Hva skal oppskriften hete?'} lead="Navn er alt som trengs her. Resten kan du fylle inn når du vil.">
          <BasicsFields draft={draft} onChange={setDraft} full={editing} />
        </Step>
      )}
      {page === 1 && (
        <Step title="Hva trenger du?" lead="Trykk Enter for ny linje. Mengder kan være desimaltall, brøker eller intervaller.">
          <IngredientsEditor ingredients={draft.ingredients} onChange={(ingredients) => setDraft({ ...draft, ingredients })} />
        </Step>
      )}
      {page === 2 && (
        <Step title="Hvordan lager du den?" lead="Tid og temperatur er valgfritt. Koblingene brukes til å lage Recipe Grid.">
          <StepsEditor steps={draft.steps} ingredients={draft.ingredients} recipeTitle={draft.title} onChange={(steps) => setDraft({ ...draft, steps })} />
        </Step>
      )}
      {page === 3 && (
        <Step title="Ser dette riktig ut?" lead="Slik blir oppskriften – både som vanlig oppskrift og som Recipe Grid.">
          <div className="flex flex-col gap-6">
            <IssueList issues={findIssues(draft)} />
            {!editing && (
              <details className="rounded-2xl bg-card p-4 shadow-card">
                <summary className="cursor-pointer font-bold">Legg til historie, opphav og kategorier (valgfritt)</summary>
                <div className="mt-4">
                  <BasicsFields draft={draft} onChange={setDraft} full />
                </div>
              </details>
            )}
            <RecipePreview draft={draft} />
          </div>
        </Step>
      )}
    </FormPage>
  )
}

function Step({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[2rem] leading-tight font-semibold">{title}</h1>
        <p className="mt-2 text-ink-2">{lead}</p>
      </div>
      {children}
    </div>
  )
}
