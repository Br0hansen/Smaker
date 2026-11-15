import { IonContent, IonPage } from '@ionic/react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <IonPage>
      <IonContent>
        <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="font-display text-7xl italic text-tomato">Oi!</span>
          <h1 className="text-[1.8rem] font-semibold">Fant ikke oppskriften</h1>
          <p className="max-w-sm text-ink-2">Den kan ha blitt flyttet eller slettet.</p>
          <Link to="/" className="btn btn-primary">Til kokeboka</Link>
        </div>
      </IonContent>
    </IonPage>
  )
}
