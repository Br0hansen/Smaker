import { IonIcon } from '@ionic/react'
import { cameraOutline, imagesOutline, informationCircleOutline, sparkles } from 'ionicons/icons'
import { useRef, useState } from 'react'
import { resizeImage, type Draft } from '../components/editor'
import { FormPage } from '../components/FormPage'
import { ReviewForm, SaveButton } from '../components/ReviewForm'
import { newId } from '../domain/ids'
import { parseRecipeText } from '../domain/parseRecipeText'
import { ocrAvailable, recognizeText } from '../lib/ocr'

export default function PhotoPage() {
  const [image, setImage] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const libRef = useRef<HTMLInputElement>(null)

  const onFile = async (f?: File) => {
    if (!f) return
    const url = await resizeImage(f, 2000)
    setImage(url)
    if (ocrAvailable) {
      setBusy(true)
      try {
        setText((await recognizeText(url)).text)
      } finally {
        setBusy(false)
      }
    }
  }

  const analyse = () => {
    const d = parseRecipeText(text)
    // Originalbildet tas vare på som vedlegg – viktig for gamle familieoppskrifter
    setDraft({
      ...d,
      attachments: image ? [{ id: newId(), kind: 'original-scan', url: image, caption: 'Originaloppskriften', createdAt: new Date().toISOString() }] : [],
    })
  }

  const pickers = (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={libRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
    </>
  )

  if (draft) {
    return (
      <FormPage title="Fra bilde" back="/ny" footer={<><button className="btn btn-secondary min-h-14" onClick={() => setDraft(null)}>Tilbake</button><SaveButton draft={draft} /></>}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            {image && <img src={image} alt="Originaloppskriften" className="h-24 w-20 rounded-lg object-cover shadow-card" />}
            <div>
              <h1 className="text-[2rem] font-semibold">Se over forslaget</h1>
              <p className="text-ink-2">Bildet lagres sammen med oppskriften.</p>
            </div>
          </div>
          <ReviewForm draft={draft} onChange={setDraft} />
        </div>
      </FormPage>
    )
  }

  return (
    <FormPage title="Ta bilde" back="/ny">
      {pickers}
      <h1 className="mt-2 text-[2rem] font-semibold">Ta bilde av oppskriften</h1>
      <p className="mt-2 text-ink-2">En håndskrevet lapp, et oppskriftskort eller en side i en kokebok. Hold telefonen rett over, i godt lys.</p>

      {!image ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-primary min-h-16 flex-1 text-lg" onClick={() => camRef.current?.click()}>
            <IonIcon icon={cameraOutline} className="text-2xl" aria-hidden /> Ta bilde
          </button>
          <button className="btn btn-secondary min-h-16 flex-1 text-lg" onClick={() => libRef.current?.click()}>
            <IonIcon icon={imagesOutline} className="text-2xl" aria-hidden /> Velg fra bilder
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <figure className="flex flex-col gap-2">
            <img src={image} alt="Bildet du tok" className="max-h-[28rem] w-full rounded-[var(--radius-card)] object-contain shadow-card" />
            <button className="self-start text-[0.92rem] font-bold text-tomato underline underline-offset-4" onClick={() => camRef.current?.click()}>
              Ta nytt bilde
            </button>
          </figure>
          <div className="flex flex-col gap-3">
            {!ocrAvailable && (
              <p className="flex gap-2 rounded-2xl bg-sea-soft p-4 text-[0.95rem] text-ink">
                <IonIcon icon={informationCircleOutline} className="mt-0.5 shrink-0 text-xl text-sea" aria-hidden />
                Automatisk lesing av bildet kommer snart. Skriv av teksten her så lenge – bildet tas vare på uansett.
              </p>
            )}
            <textarea
              className="field min-h-[16rem] flex-1 leading-relaxed"
              value={busy ? 'Leser teksten …' : text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Tittel\n\nIngredienser\n3 egg\n…\n\nFremgangsmåte\n1. …'}
              aria-label="Teksten fra bildet"
              disabled={busy}
            />
            <button className="btn btn-primary min-h-14" disabled={!text.trim() || busy} onClick={analyse}>
              <IonIcon icon={sparkles} aria-hidden /> Lag oppskrift
            </button>
          </div>
        </div>
      )}
    </FormPage>
  )
}
