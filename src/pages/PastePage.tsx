import { IonIcon, useIonRouter } from '@ionic/react'
import { clipboardOutline, sparkles } from 'ionicons/icons'
import { useState } from 'react'
import { type Draft } from '../components/editor'
import { FormPage } from '../components/FormPage'
import { ReviewForm, SaveButton } from '../components/ReviewForm'
import { parseRecipeText } from '../domain/parseRecipeText'
import { aiAvailable, asUrl } from '../lib/ai'

const EXAMPLE = `Kremet kyllingpasta
4 porsjoner · Tid: 30 min

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
3. Stek kyllingen og hvitløken i 5–7 minutter.
4. Hell i fløten og la det småkoke i 3 minutter.
5. Riv parmesanen.
6. Rør inn parmesanen og smak til med salt og pepper.
7. Kok pastaen separat etter anvisning på pakken.
8. Vend pastaen inn i sausen.`

export default function PastePage() {
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const router = useIonRouter()
  const pastedUrl = asUrl(text)
  const canClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText

  const analyse = (t = text) => {
    const d = parseRecipeText(t)
    setDraft({ ...d, attachments: [] })
  }

  return (
    <FormPage title="Lim inn" back="/ny" footer={draft ? <><button className="btn btn-secondary min-h-14" onClick={() => setDraft(null)}>Endre</button><SaveButton draft={draft} /></> : undefined}>
      {!draft ? (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="mt-2 text-[2rem] font-semibold">Lim inn oppskriften</h1>
            <p className="mt-2 text-ink-2">Kopier hele oppskriften – tittel, ingredienser og fremgangsmåte – og lim den inn her.</p>
          </div>
          <textarea
            className="field min-h-[18rem] font-sans text-[1.02rem] leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Lim inn her …"
            aria-label="Oppskriftstekst"
            autoFocus
          />
          {pastedUrl && aiAvailable && (
            <div className="flex flex-col gap-2 rounded-2xl bg-sea-soft p-4">
              <p className="font-bold text-ink">Dette er en lenke.</p>
              <button className="btn btn-primary self-start" onClick={() => router.push(`/ny/lenke?url=${encodeURIComponent(pastedUrl)}`, 'forward', 'replace')}>
                Hent oppskriften fra siden
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {canClipboard && (
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText()
                    if (t) setText(t)
                  } catch { /* brukeren sa nei – de kan lime inn selv */ }
                }}
              >
                <IonIcon icon={clipboardOutline} aria-hidden /> Lim inn fra utklippstavlen
              </button>
            )}
            <button className="btn btn-primary" disabled={!text.trim()} onClick={() => analyse()}>
              <IonIcon icon={sparkles} aria-hidden /> Tolk oppskriften
            </button>
          </div>
          <button className="self-start text-[0.92rem] font-bold text-tomato underline underline-offset-4" onClick={() => { setText(EXAMPLE); analyse(EXAMPLE) }}>
            Prøv med et eksempel
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="mt-2 text-[2rem] font-semibold">Se over forslaget</h1>
            <p className="mt-2 text-ink-2">Vi har sortert teksten og koblet ingrediensene til stegene. Rett det som ikke stemmer.</p>
          </div>
          <ReviewForm draft={draft} onChange={setDraft} />
        </div>
      )}
    </FormPage>
  )
}
