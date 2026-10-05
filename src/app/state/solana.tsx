import { createContext, use, useMemo, type ReactNode } from 'react'
import type { Connection } from '@solana/web3.js'
import { DEFAULT_RPC, type NetworkId } from '../config'
import { getConnection } from '../lib/solana'
import { useStored } from '../lib/storage'
import { TOKENS, type Token } from '../lib/tokens'
import { useWallet } from './wallet'

type Settings = { rpc: Partial<Record<NetworkId, string>> }
const DEFAULT_SETTINGS: Settings = { rpc: {} }

type SolanaApi = {
  network: NetworkId
  rpcUrl: string
  rpcIsCustom: boolean
  connection: Connection
  tokens: Token[]
  setRpc: (network: NetworkId, url: string | null) => void
  /** Connection for a specific network, e.g. a pay link or proof made on another network. */
  connectionFor: (network: NetworkId) => Connection
}

const SolanaContext = createContext<SolanaApi | null>(null)

export function useSolana() {
  const v = use(SolanaContext)
  if (!v) throw new Error('useSolana must be used inside SolanaProvider')
  return v
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  const { network } = useWallet()
  const [settings, setSettings] = useStored('settings', DEFAULT_SETTINGS)
  const custom = settings.rpc[network]
  const rpcUrl = custom || DEFAULT_RPC[network]

  const api = useMemo<SolanaApi>(
    () => ({
      network,
      rpcUrl,
      rpcIsCustom: Boolean(custom),
      connection: getConnection(rpcUrl),
      tokens: TOKENS[network],
      setRpc: (n, url) => setSettings((s) => ({ ...s, rpc: { ...s.rpc, [n]: url?.trim() || undefined } })),
      connectionFor: (n) => getConnection(settings.rpc[n] || DEFAULT_RPC[n]),
    }),
    [network, rpcUrl, custom, setSettings, settings.rpc],
  )
  return <SolanaContext value={api}>{children}</SolanaContext>
}
