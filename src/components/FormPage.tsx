import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react'
import type { ReactNode } from 'react'

/** Ramme for skjemasider: tilbakeknapp, tittel og innhold med god luft. */
export function FormPage({ title, back = '/', children, footer }: { title: string; back?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={back} text="Tilbake" />
          </IonButtons>
          <IonTitle className="font-display">{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-36 md:px-8">{children}</div>
      </IonContent>
      {footer && (
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:px-8">{footer}</div>
        </div>
      )}
    </IonPage>
  )
}
