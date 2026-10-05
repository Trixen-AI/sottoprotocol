import { useResource } from './useResource'
import type { Token } from './tokens'

const IDS = ['solana', 'usd-coin', 'zcash']
const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS.join(',')}&vs_currencies=usd`

export type Prices = Record<string, number>

async function fetchPrices(): Promise<Prices> {
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Prices unavailable (${res.status})`)
  const json = (await res.json()) as Record<string, { usd?: number }>
  return Object.fromEntries(Object.entries(json).flatMap(([id, v]) => (typeof v.usd === 'number' ? [[id, v.usd]] : [])))
}

export function usePrices() {
  return useResource('prices', fetchPrices, { refreshMs: 60_000 })
}

export function priceOf(prices: Prices | undefined, token: Token | undefined) {
  return token?.coingeckoId ? prices?.[token.coingeckoId] : undefined
}
