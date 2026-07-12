import { useEffect } from 'react'
import { getApiUrl } from '../config/api'

const KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000

async function pingKeepalive(): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/keepalive`)
  } catch {
    // Server may be waking up or unreachable; next interval will retry.
  }
}

export function useServerKeepalive() {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    const stop = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId)
        intervalId = undefined
      }
    }

    const start = () => {
      stop()
      void pingKeepalive()
      intervalId = setInterval(() => void pingKeepalive(), KEEPALIVE_INTERVAL_MS)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') {
      start()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
