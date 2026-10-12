import { createContext, use, useMemo, type ReactNode } from 'react'
import type { PublicClient } from 'viem'
import { DEFAULT_RPC, type NetworkId } from '../config'
import { getClient } from '../lib/chain'
import { TOKENS, type Token } from '../lib/tokens'
import { useWallet } from './wallet'

type ChainApi = {
  network: NetworkId
  rpcUrl: string
  client: PublicClient
  tokens: Token[]
  /** Client for a specific network, e.g. the one a pay link or proof was made on. */
  clientFor: (network: NetworkId) => PublicClient
}

const ChainContext = createContext<ChainApi | null>(null)

export function useChain() {
  const v = use(ChainContext)
  if (!v) throw new Error('useChain must be used inside ChainProvider')
  return v
}

/** The RPC comes from VITE_ETHEREUM_RPC_URL (see config.ts); there is no in-app override. */
export function ChainProvider({ children }: { children: ReactNode }) {
  const { network } = useWallet()
  const rpcUrl = DEFAULT_RPC[network]

  const api = useMemo<ChainApi>(
    () => ({
      network,
      rpcUrl,
      client: getClient(rpcUrl),
      tokens: TOKENS[network],
      clientFor: (n) => getClient(DEFAULT_RPC[n]),
    }),
    [network, rpcUrl],
  )
  return <ChainContext value={api}>{children}</ChainContext>
}
