// Zephyra OS runs on Ethereum mainnet only.
export type NetworkId = 'mainnet'

export const NETWORKS: NetworkId[] = ['mainnet']

export const CHAIN_ID = 1

export const REOWN_PROJECT_ID = (import.meta.env.VITE_REOWN_PROJECT_ID ?? '').trim()

// Any Ethereum mainnet RPC that accepts browser requests. PublicNode's free endpoint does;
// set VITE_ETHEREUM_RPC_URL (Alchemy, Infura, QuickNode...) for production.
export const DEFAULT_RPC: Record<NetworkId, string> = {
  mainnet: import.meta.env.VITE_ETHEREUM_RPC_URL?.trim() || 'https://ethereum-rpc.publicnode.com',
}

// Public indexer for address history and token lists (an RPC cannot list an address's transactions).
export const BLOCKSCOUT_API = 'https://eth.blockscout.com/api/v2'

export const NETWORK_LABEL: Record<NetworkId, string> = {
  mainnet: 'Ethereum',
}

export function explorerUrl(_network: NetworkId, kind: 'tx' | 'address', id: string) {
  return `https://etherscan.io/${kind}/${id}`
}
