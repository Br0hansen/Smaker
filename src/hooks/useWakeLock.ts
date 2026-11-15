import { useEffect, useState } from 'react'

export type WakeLockStatus = 'active' | 'unsupported' | 'off'

/** Holder skjermen våken mens matlagingsmodus er åpen, der nettleseren støtter det. */
export function useWakeLock(enabled: boolean): WakeLockStatus {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [status, setStatus] = useState<WakeLockStatus>(supported ? 'off' : 'unsupported')

  useEffect(() => {
    if (!supported || !enabled) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) { sentinel.release(); return }
        setStatus('active')
        sentinel.addEventListener('release', () => setStatus('off'))
      } catch {
        setStatus('off')
      }
    }
    // Låsen slippes når fanen skjules – be om den igjen når brukeren kommer tilbake.
    const onVisible = () => { if (document.visibilityState === 'visible') request() }

    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      sentinel?.release()
    }
  }, [enabled, supported])

  return status
}
