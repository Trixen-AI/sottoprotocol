import { useChain } from '../state/chain'
import { getHistory } from './blockscout'
import { getHoldings, type Holding } from './chain'
import { scanExposure } from './exposure'
import { useResource } from './useResource'

// Resource keys start with the network so data from different networks never mixes.

export function useHoldings(address: string | null | undefined, refreshMs = 30_000) {
  const { client, network, tokens } = useChain()
  return useResource(address ? `${network}:holdings:${address}` : null, () => getHoldings(client, address!, tokens), { refreshMs })
}

export function useHistory(address: string | null | undefined, limit = 15) {
  const { network } = useChain()
  return useResource(address ? `${network}:history:${address}:${limit}` : null, () => getHistory(address!, limit), {
    refreshMs: 60_000,
  })
}

export function useManyHoldings(addresses: string[]) {
  const { client, network, tokens } = useChain()
  const key = addresses.length ? `${network}:holdings-many:${addresses.join(',')}` : null
  return useResource(
    key,
    async () => {
      const out: Record<string, Holding[]> = {}
      for (const a of addresses) out[a] = await getHoldings(client, a, tokens)
      return out
    },
    { refreshMs: 45_000 },
  )
}

export function useExposure(address: string | null) {
  const { client, network, tokens } = useChain()
  return useResource(address ? `${network}:exposure:${address}` : null, () => scanExposure(client, address!, tokens, 50))
}
