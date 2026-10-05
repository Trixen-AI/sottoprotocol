import { useEffect, useState } from 'react'

const URL = 'https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd&include_24hr_change=true'
const REFRESH_MS = 60_000

export type ZecPrice = { usd: number; change: number | null } | null

// Live ZEC/USD from CoinGecko's public endpoint, refreshed every minute while the tab is visible.
export function useZecPrice() {
  const [price, setPrice] = useState<ZecPrice>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    let ctrl: AbortController | null = null
    const load = async () => {
      if (document.hidden) return
      ctrl?.abort()
      ctrl = new AbortController()
      try {
        const res = await fetch(URL, { signal: ctrl.signal })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { zcash?: { usd?: number; usd_24h_change?: number } }
        if (!alive || typeof data.zcash?.usd !== 'number') return
        setPrice({ usd: data.zcash.usd, change: data.zcash.usd_24h_change ?? null })
        setFailed(false)
      } catch (e) {
        if (alive && (e as Error).name !== 'AbortError') setFailed(true)
      }
    }
    load()
    const id = window.setInterval(load, REFRESH_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      alive = false
      ctrl?.abort()
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  return { price, failed }
}
