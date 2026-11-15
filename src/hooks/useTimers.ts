import { useCallback, useEffect, useRef, useState } from 'react'

export interface Timer {
  id: string
  label: string
  totalSec: number
  /** Tidspunkt (ms) da tidtakeren er ferdig. null når den er satt på pause. */
  endsAt: number | null
  /** Gjenstående sekunder når den er satt på pause. */
  pausedLeft: number
  done: boolean
}

/** Flere tidtakere samtidig, med lyd og vibrasjon når en er ferdig. */
export function useTimers() {
  const [timers, setTimers] = useState<Timer[]>([])
  const [now, setNow] = useState(() => Date.now())
  const audio = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!timers.some((t) => t.endsAt && !t.done)) return
    const h = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(h)
  }, [timers])

  useEffect(() => {
    const finished = timers.filter((t) => !t.done && t.endsAt && t.endsAt <= now)
    if (!finished.length) return
    setTimers((ts) => ts.map((t) => (finished.some((f) => f.id === t.id) ? { ...t, done: true, endsAt: null, pausedLeft: 0 } : t)))
    alarm(audio)
  }, [now, timers])

  const start = useCallback((id: string, label: string, minutes: number) => {
    // Lyd må "låses opp" av et trykk fra brukeren
    audio.current ??= new AudioContext()
    const totalSec = Math.round(minutes * 60)
    setTimers((ts) => [...ts.filter((t) => t.id !== id), { id, label, totalSec, endsAt: Date.now() + totalSec * 1000, pausedLeft: totalSec, done: false }])
    setNow(Date.now())
  }, [])

  const toggle = useCallback((id: string) => {
    setTimers((ts) =>
      ts.map((t) => {
        if (t.id !== id || t.done) return t
        if (t.endsAt) return { ...t, endsAt: null, pausedLeft: Math.max(0, Math.round((t.endsAt - Date.now()) / 1000)) }
        return { ...t, endsAt: Date.now() + t.pausedLeft * 1000 }
      }),
    )
  }, [])

  const remove = useCallback((id: string) => setTimers((ts) => ts.filter((t) => t.id !== id)), [])

  const left = (t: Timer) => (t.done ? 0 : t.endsAt ? Math.max(0, Math.ceil((t.endsAt - now) / 1000)) : t.pausedLeft)

  return { timers, start, toggle, remove, left }
}

function alarm(ctx: React.MutableRefObject<AudioContext | null>) {
  navigator.vibrate?.([300, 150, 300, 150, 300])
  const ac = ctx.current
  if (!ac) return
  const t0 = ac.currentTime
  for (let i = 0; i < 3; i++) {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, t0 + i * 0.45)
    g.gain.exponentialRampToValueAtTime(0.3, t0 + i * 0.45 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.45 + 0.35)
    o.connect(g).connect(ac.destination)
    o.start(t0 + i * 0.45)
    o.stop(t0 + i * 0.45 + 0.4)
  }
}

export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
