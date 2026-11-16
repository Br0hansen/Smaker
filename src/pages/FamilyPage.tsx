import { IonAlert, IonContent, IonIcon, IonPage, useIonToast } from '@ionic/react'
import { checkmark, copyOutline, createOutline, lockClosedOutline, logOutOutline, personAddOutline, shareOutline, trashOutline } from 'ionicons/icons'
import { useState } from 'react'
import { MainHeader } from '../components/AppChrome'
import { Avatar, SectionTitle } from '../components/ui'
import { createInviteLink, deleteFamily, signOut, updateMyName, useEmail, useFamily, useMode, useRecipes, useUserId } from '../data/store'
import type { FamilyInvite } from '../data/store'
import type { MemberRole } from '../domain/types'

const ROLE: Record<MemberRole, string> = { owner: 'Eier', admin: 'Administrator', member: 'Medlem' }

export default function FamilyPage() {
  const family = useFamily()
  const recipes = useRecipes()
  const mode = useMode()
  const email = useEmail()
  const me = useUserId()
  const [invite, setInvite] = useState<FamilyInvite | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const myMember = family.members.find((m) => m.id === me)
  const [name, setName] = useState(myMember?.name ?? '')
  const [toast] = useIonToast()

  const canInvite = mode === 'local' || myMember?.role === 'owner' || myMember?.role === 'admin'
  const count = (id: string) => recipes.filter((r) => r.createdBy === id).length
  const say = (message: string, color?: string) => toast({ message, duration: 2500, position: 'top', color })

  const makeLink = async () => {
    setBusy(true)
    try {
      setInvite(await createInviteLink())
    } catch (e) {
      say(`Klarte ikke å lage kode: ${(e as Error).message}`, 'danger')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite!.code)
      say('Koden er kopiert')
    } catch {
      say('Merk koden og kopier den selv')
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Bli med i ${family.name} på Smaker`, text: `Bruk invitasjonskoden ${invite!.code}:`, url: invite!.url })
        return
      } catch { /* avbrutt – faller tilbake til kopiering */ }
    }
    await copy()
  }

  const saveName = async () => {
    try {
      await updateMyName(name.trim())
      setEditing(false)
    } catch (e) {
      say(`Klarte ikke å lagre navnet: ${(e as Error).message}`, 'danger')
    }
  }

  const removeFamily = async () => {
    setDeleting(true)
    try {
      await deleteFamily()
    } catch (e) {
      say(`Klarte ikke å slette familien: ${(e as Error).message}`, 'danger')
      setDeleting(false)
    }
  }

  return (
    <IonPage>
      <MainHeader />
      <IonContent>
        <div className="page-wrap flex max-w-3xl flex-col gap-10 pt-4 pb-16">
          <div>
            <span className="eyebrow">Familiegruppe</span>
            <h1 className="mt-1 text-[2.2rem] font-semibold">{family.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-ink-2">
              <IonIcon icon={lockClosedOutline} aria-hidden /> Privat – bare de som er invitert kan se oppskriftene.
            </p>
          </div>

          <section>
            <SectionTitle>Medlemmer</SectionTitle>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-card shadow-card">
              {family.members.map((m) => (
                <li key={m.id} className="flex items-center gap-4 p-4">
                  <Avatar member={m} size="lg" />
                  {m.id === me && editing ? (
                    <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void saveName() }}>
                      <input className="field min-h-11 flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus aria-label="Ditt navn" />
                      <button className="btn btn-primary size-11 min-h-11 p-0" aria-label="Lagre navn" disabled={!name.trim()}>
                        <IonIcon icon={checkmark} className="text-xl" />
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-lg font-bold">
                        {m.name}
                        {m.id === me && <span className="text-[0.85rem] font-normal text-ink-3">(deg)</span>}
                      </div>
                      <div className="text-[0.9rem] text-ink-3">{count(m.id)} {count(m.id) === 1 ? 'oppskrift' : 'oppskrifter'}</div>
                    </div>
                  )}
                  {m.id === me && !editing && (
                    <button className="btn btn-ghost size-10 min-h-10 p-0" onClick={() => { setName(m.name); setEditing(true) }} aria-label="Endre navnet ditt">
                      <IonIcon icon={createOutline} className="text-xl" />
                    </button>
                  )}
                  {!(m.id === me && editing) && <span className={`chip ${m.role === 'member' ? '' : 'bg-ink text-paper'}`}>{ROLE[m.role]}</span>}
                </li>
              ))}
            </ul>
          </section>

          {canInvite && (
            <section className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-sage-soft p-6">
              <h2 className="text-[1.45rem] font-semibold">Inviter flere</h2>
              <p className="text-ink-2">Del koden eller lenken med den du vil invitere. Koden virker bare én gang og går ut etter én time.</p>
              {!invite ? (
                <button className="btn btn-primary min-h-14 self-start px-6" onClick={makeLink} disabled={busy}>
                  <IonIcon icon={personAddOutline} aria-hidden className="text-xl" /> {busy ? 'Lager kode …' : 'Lag invitasjonskode'}
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="field flex items-center justify-center font-mono text-[1.7rem] font-bold tracking-[0.25em] text-ink select-all" aria-label={`Invitasjonskode ${invite.code}`}>{invite.code}</div>
                  <div className="text-[0.85rem] break-all text-ink-3 select-all">{invite.url}</div>
                  <div className="flex flex-wrap gap-3">
                    <button className="btn btn-primary" onClick={share}>
                      <IonIcon icon={shareOutline} aria-hidden /> Del lenken
                    </button>
                    <button className="btn btn-secondary" onClick={copy}>
                      <IonIcon icon={copyOutline} aria-hidden /> Kopier kode
                    </button>
                    <button className="btn btn-ghost" onClick={() => setInvite(null)}>Lag en ny kode</button>
                  </div>
                  {mode === 'local' && <p className="text-[0.85rem] text-ink-3">Demomodus: lenken virker ikke uten innlogging.</p>}
                </div>
              )}
            </section>
          )}

          {mode === 'remote' && (
            <section className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-6">
              <p className="text-ink-2">
                Logget inn som <strong className="text-ink">{email}</strong>
              </p>
              <button className="btn btn-secondary" onClick={() => void signOut()}>
                <IonIcon icon={logOutOutline} aria-hidden /> Logg ut
              </button>
            </section>
          )}
          {mode === 'remote' && myMember?.role === 'owner' && (
            <section className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-tomato-soft p-6">
              <div>
                <h2 className="text-[1.45rem] font-semibold text-tomato-deep">Slett familien</h2>
                <p className="mt-2 text-ink-2">Dette sletter familien, alle oppskriftene og alle bildene permanent for alle medlemmer.</p>
              </div>
              <button className="btn btn-secondary self-start border-tomato text-tomato-deep" onClick={() => setConfirmingDelete(true)} disabled={deleting}>
                <IonIcon icon={trashOutline} aria-hidden /> {deleting ? 'Sletter …' : 'Slett familien permanent'}
              </button>
            </section>
          )}
        </div>

        <IonAlert
          isOpen={confirmingDelete}
          onDidDismiss={() => setConfirmingDelete(false)}
          header="Slett familien permanent?"
          message={`Skriv familienavnet «${family.name}» for å bekrefte. Handlingen kan ikke angres.`}
          inputs={[{ name: 'familyName', type: 'text', placeholder: family.name, attributes: { maxLength: 80, autoComplete: 'off' } }]}
          buttons={[
            { text: 'Avbryt', role: 'cancel' },
            {
              text: 'Slett permanent',
              role: 'destructive',
              handler: (values) => {
                if (values.familyName?.trim() !== family.name) {
                  say('Familienavnet stemmer ikke.', 'danger')
                  return false
                }
                void removeFamily()
                return true
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}
