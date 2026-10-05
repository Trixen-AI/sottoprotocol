import { createContext, use, useMemo, type ReactNode } from 'react'
import type { Connection } from '@solana/web3.js'
import { DEFAULT_RPC, type NetworkId } from '../config'
import { getConnection } from '../lib/solana'
import { TOKENS, type Token } from '../lib/tokens'
import { useWallet } from './wallet'

type SolanaApi = {
  network: NetworkId
  rpcUrl: string
  connection: Connection
  tokens: Token[]
  /** Connection for a specific network, e.g. the one a pay link or proof was made on. */
  connectionFor: (network: NetworkId) => Connection
}

const SolanaContext = createContext<SolanaApi | null>(null)

export function useSolana() {
  const v = use(SolanaContext)
  if (!v) throw new Error('useSolana must be used inside SolanaProvider')
  return v
}

/** The RPC comes from VITE_SOLANA_RPC_URL (see config.ts); there is no in-app override. */
export function SolanaProvider({ children }: { children: ReactNode }) {
  const { network } = useWallet()
  const rpcUrl = DEFAULT_RPC[network]

  const api = useMemo<SolanaApi>(
    () => ({
      network,
      rpcUrl,
      connection: getConnection(rpcUrl),
      tokens: TOKENS[network],
      connectionFor: (n) => getConnection(DEFAULT_RPC[n]),
    }),
    [network, rpcUrl],
  )
  return <SolanaContext value={api}>{children}</SolanaContext>
}
