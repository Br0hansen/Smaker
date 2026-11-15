import { IonIcon } from '@ionic/react'
import { add, alertCircleOutline, cameraOutline, closeCircle, createOutline, imagesOutline, refreshOutline, sparkles } from 'ionicons/icons'
import { useRef, useState } from 'react'
import { resizeImage, type Draft } from '../components/editor'
import { FormPage } from '../components/FormPage'
import { ReviewForm, SaveButton } from '../components/ReviewForm'
import { newId } from '../domain/ids'
import { parseRecipeText } from '../domain/parseRecipeText'
import { aiAvailable as ocrAvailable, readRecipeFromImages } from '../lib/ai'

const MAX_IMAGES = 4
type Phase = 'pick' | 'reading' | 'manual' | 'review'

/**
 * Bilde → oppskrift. Ett eller flere bilder (skjermbilder, kokebokssider,
 * håndskrevne kort) leses av Claude og legges rett i kontrollskjemaet.
 * Originalbildene lagres alltid som vedlegg.
 */
export default function PhotoPage() {
  const [images, setImages] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('pick')
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [uncertain, setUncertain] = useState<string[]>([])
  const [text, setText] = useState('')
  const camRef = useRef<HTMLInputElement>(null)
  const libRef = useRef<HTMLInputElement>(null)

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_IMAGES - images.length
    const resized = await Promise.all([...files].slice(0, room).map((f) => resizeImage(f, 2000)))
    setImages((prev) => [...prev, ...resized].slice(0, MAX_IMAGES))
    setError(null)
  }

  const attachments = () =>
    images.map((url, i) => ({
      id: newId(),
      kind: 'original-scan' as const,
      url,
      caption: images.length > 1 ? `Originalen (${i + 1} av ${images.length})` : 'Originalen',
      createdAt: new Date().toISOString(),
    }))

  const read = async () => {
    setPhase('reading')
    setError(null)
    try {
      const result = await readRecipeFromImages(images)
      setDraft({ ...result.draft, attachments: attachments() })
      setUncertain(result.uncertain)
      setPhase('review')
    } catch (e) {
      setError((e as Error).message)
      setPhase('pick')
    }
  }

  const fromText = () => {
    setDraft({ ...parseRecipeText(text), attachments: attachments() })
    setUncertain([])
    setPhase('review')
  }

  const inputs = (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} />
      <input ref={libRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} />
    </>
  )

  if (phase === 'review' && draft) {
    return (
      <FormPage
        title="Fra bilde"
        back="/ny"
        footer={<><button className="btn btn-secondary min-h-14" onClick={() => setPhase('pick')}>Tilbake</button><SaveButton draft={draft} /></>}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-6">
              {images.slice(0, 3).map((src, i) => (
                <img key={i} src={src} alt="" className="h-20 w-16 rounded-lg object-cover shadow-card ring-2 ring-paper" />
              ))}
            </div>
            <div>
              <h1 className="text-[1.8rem] leading-tight font-semibold">Se over forslaget</h1>
              <p className="text-ink-2">Bildene lagres sammen med oppskriften.</p>
            </div>
          </div>
          {uncertain.length > 0 && (
            <div className="missing rounded-2xl p-4">
              <p className="flex items-center gap-2 font-bold text-saffron">
                <IonIcon icon={alertCircleOutline} aria-hidden /> Dette var vanskelig å lese – sjekk mot bildet:
              </p>
              <ul className="mt-1 list-disc pl-6 text-ink-2">
                {uncertain.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </div>
          )}
          <ReviewForm draft={draft} onChange={setDraft} />
        </div>
      </FormPage>
    )
  }

  return (
    <FormPage title="Fra bilde" back="/ny">
      {inputs}
      <h1 className="mt-2 text-[2rem] leading-tight font-semibold">Ta bilde av oppskriften</h1>
      <p className="mt-2 text-ink-2">
        En håndskrevet lapp, et oppskriftskort, en side i en kokebok – eller et skjermbilde. Går oppskriften over flere sider, legg til opptil {MAX_IMAGES} bilder.
      </p>

      {images.length === 0 ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-primary min-h-16 flex-1 text-lg" onClick={() => camRef.current?.click()}>
            <IonIcon icon={cameraOutline} className="text-2xl" aria-hidden /> Ta bilde
          </button>
          <button className="btn btn-secondary min-h-16 flex-1 text-lg" onClick={() => libRef.current?.click()}>
            <IonIcon icon={imagesOutline} className="text-2xl" aria-hidden /> Velg bilder eller skjermbilder
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Valgte bilder">
            {images.map((src, i) => (
              <li key={i} className="relative">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-card shadow-card">
                  <img src={src} alt={`Bilde ${i + 1}`} className="size-full object-cover" />
                  {phase === 'reading' && <span aria-hidden className="scan-line" />}
                </div>
                {phase !== 'reading' && (
                  <button
                    className="absolute -top-2 -right-2 grid size-9 place-items-center rounded-full bg-card text-2xl text-ink shadow-card"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    aria-label={`Fjern bilde ${i + 1}`}
                  >
                    <IonIcon icon={closeCircle} />
                  </button>
                )}
              </li>
            ))}
            {images.length < MAX_IMAGES && phase !== 'reading' && (
              <li>
                <button
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line-2 font-bold text-ink-2"
                  onClick={() => libRef.current?.click()}
                >
                  <IonIcon icon={add} className="text-3xl" aria-hidden /> Legg til
                </button>
              </li>
            )}
          </ul>

          {error && (
            <p role="alert" className="flex gap-2 rounded-2xl bg-tomato-soft p-4 font-bold text-tomato-deep">
              <IonIcon icon={alertCircleOutline} className="mt-0.5 shrink-0 text-xl" aria-hidden /> {error}
            </p>
          )}

          {phase === 'reading' ? (
            <p className="text-center text-[1.05rem] font-bold text-ink-2" aria-live="polite">
              Leser oppskriften … Det tar vanligvis 10–30 sekunder.
            </p>
          ) : phase === 'manual' || !ocrAvailable ? (
            <div className="flex flex-col gap-3">
              {!ocrAvailable && <p className="text-[0.95rem] text-ink-2">Automatisk lesing krever innlogging. Skriv av teksten her – bildene lagres uansett.</p>}
              <textarea
                className="field min-h-[14rem] leading-relaxed"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'Tittel\n\nIngredienser\n3 egg\n…\n\nFremgangsmåte\n1. …'}
                aria-label="Teksten fra bildet"
              />
              <button className="btn btn-primary min-h-14" disabled={!text.trim()} onClick={fromText}>
                <IonIcon icon={sparkles} aria-hidden /> Lag oppskrift
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button className="btn btn-primary min-h-16 text-lg" onClick={read}>
                <IonIcon icon={error ? refreshOutline : sparkles} aria-hidden className="text-2xl" /> {error ? 'Prøv igjen' : 'Les oppskriften'}
              </button>
              <button className="btn btn-ghost" onClick={() => setPhase('manual')}>
                <IonIcon icon={createOutline} aria-hidden /> Skriv av selv i stedet
              </button>
            </div>
          )}
        </div>
      )}
    </FormPage>
  )
}
