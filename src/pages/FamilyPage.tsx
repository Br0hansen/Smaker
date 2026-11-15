import { IonContent, IonIcon, IonPage, useIonToast } from '@ionic/react'
import { copyOutline, lockClosedOutline, personAddOutline, shareOutline } from 'ionicons/icons'
import { useState } from 'react'
import { MainHeader, TabBar } from '../components/AppChrome'
import { Avatar, SectionTitle } from '../components/ui'
import { createInviteLink, useFamily, useRecipes } from '../data/store'
import type { MemberRole } from '../domain/types'

const ROLE: Record<MemberRole, string> = { owner: 'Eier', admin: 'Administrator', member: 'Medlem' }

export default function FamilyPage() {
  const family = useFamily()
  const recipes = useRecipes()
  const [link, setLink] = useState<string | null>(null)
  const [toast] = useIonToast()

  const count = (id: string) => recipes.filter((r) => r.createdBy === id).length

  const share = async () => {
    if (!link) return
    if (navigator.share) {
      try {
        await navigator.share({ title: `Bli med i ${family.name} på Smaker`, text: 'Her er familiens kokebok:', url: link })
        return
      } catch { /* avbrutt – faller tilbake til kopiering */ }
    }
    await navigator.clipboard?.writeText(link)
    toast({ message: 'Lenken er kopiert', duration: 2000, position: 'top' })
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
                  <div className="flex-1">
                    <div className="text-lg font-bold">{m.name}</div>
                    <div className="text-[0.9rem] text-ink-3">{count(m.id)} {count(m.id) === 1 ? 'oppskrift' : 'oppskrifter'}</div>
                  </div>
                  <span className={`chip ${m.role === 'member' ? '' : 'bg-ink text-paper'}`}>{ROLE[m.role]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-sage-soft p-6">
            <h2 className="text-[1.45rem] font-semibold">Inviter flere</h2>
            <p className="text-ink-2">Send en lenke til den du vil invitere. Lenken virker bare én gang og går ut etter sju dager.</p>
            {!link ? (
              <button className="btn btn-primary min-h-14 self-start px-6" onClick={() => setLink(createInviteLink())}>
                <IonIcon icon={personAddOutline} aria-hidden className="text-xl" /> Lag invitasjonslenke
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="field flex items-center font-mono text-[0.85rem] break-all text-ink-2">{link}</div>
                <div className="flex flex-wrap gap-3">
                  <button className="btn btn-primary" onClick={share}>
                    <IonIcon icon={shareOutline} aria-hidden /> Del lenken
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(link)
                      toast({ message: 'Lenken er kopiert', duration: 2000, position: 'top' })
                    }}
                  >
                    <IonIcon icon={copyOutline} aria-hidden /> Kopier
                  </button>
                </div>
                <p className="text-[0.85rem] text-ink-3">Demo: invitasjoner blir ekte når innlogging med Supabase er koblet på.</p>
              </div>
            )}
          </section>
        </div>
      </IonContent>
      <TabBar />
    </IonPage>
  )
}
