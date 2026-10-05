import { useSolana } from '../state/solana'
import { scanExposure } from './exposure'
import { getHistory, getHoldings, type Holding } from './solana'
import { useResource } from './useResource'

// Resource keys start with the network so a switch never shows another network's data.

export function useHoldings(address: string | null | undefined, refreshMs = 30_000) {
  const { connection, network, tokens } = useSolana()
  return useResource(address ? `${network}:holdings:${address}` : null, () => getHoldings(connection, address!, tokens), { refreshMs })
}

export function useHistory(address: string | null | undefined, limit = 15) {
  const { connection, network } = useSolana()
  return useResource(address ? `${network}:history:${address}:${limit}` : null, () => getHistory(connection, address!, limit), {
    refreshMs: 60_000,
  })
}

export function useManyHoldings(addresses: string[]) {
  const { connection, network, tokens } = useSolana()
  const key = addresses.length ? `${network}:holdings-many:${addresses.join(',')}` : null
  return useResource(
    key,
    async () => {
      const out: Record<string, Holding[]> = {}
      for (const a of addresses) out[a] = await getHoldings(connection, a, tokens)
      return out
    },
    { refreshMs: 45_000 },
  )
}

export function useExposure(address: string | null) {
  const { connection, network, tokens } = useSolana()
  return useResource(address ? `${network}:exposure:${address}` : null, () => scanExposure(connection, address!, tokens, 40))
}
