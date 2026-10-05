// Sotto runs on Solana mainnet only.
export type NetworkId = 'mainnet'

export const NETWORKS: NetworkId[] = ['mainnet']

export const REOWN_PROJECT_ID = (import.meta.env.VITE_REOWN_PROJECT_ID ?? '').trim()

// Solana's own public mainnet endpoint rejects browser requests (HTTP 403), so the default
// RPC is PublicNode's free endpoint, which allows them. Set VITE_SOLANA_RPC_URL for production.
export const DEFAULT_RPC: Record<NetworkId, string> = {
  mainnet: import.meta.env.VITE_SOLANA_RPC_URL?.trim() || 'https://solana-rpc.publicnode.com',
}

export const NETWORK_LABEL: Record<NetworkId, string> = {
  mainnet: 'Solana',
}

export function explorerUrl(_network: NetworkId, kind: 'tx' | 'account', id: string) {
  return `https://solscan.io/${kind}/${id}`
}
