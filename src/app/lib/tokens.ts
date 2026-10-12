import type { Address } from 'viem'
import type { NetworkId } from '../config'

export type Token = {
  symbol: string
  name: string
  /** ERC-20 contract, null for native ETH */
  contract: Address | null
  decimals: number
  coingeckoId?: string
  /** NEAR Intents 1Click asset id for this token on Ethereum */
  oneClickAsset?: string
}

export const ETH: Token = {
  symbol: 'ETH',
  name: 'Ether',
  contract: null,
  decimals: 18,
  coingeckoId: 'ethereum',
  oneClickAsset: 'nep141:eth.omft.near',
}

// Contracts and 1Click asset ids as listed by the 1Click token registry.
const MAINNET: Token[] = [
  ETH,
  {
    symbol: 'USDC',
    name: 'USD Coin',
    contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    coingeckoId: 'usd-coin',
    oneClickAsset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    coingeckoId: 'tether',
    oneClickAsset: 'nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near',
  },
]

export const TOKENS: Record<NetworkId, Token[]> = { mainnet: MAINNET }

/** Native ZEC on the Zcash chain, as a 1Click asset. */
export const ZEC_NATIVE_ASSET = 'nep141:zec.omft.near'
export const ZEC_DECIMALS = 8

export function tokenBySymbol(network: NetworkId, symbol: string) {
  return TOKENS[network].find((t) => t.symbol === symbol)
}

export function tokenByContract(network: NetworkId, contract: string | null) {
  return TOKENS[network].find((t) => (t.contract === null ? contract === null : contract !== null && t.contract.toLowerCase() === contract.toLowerCase()))
}

/** 'ETH' or the lower-case contract address: one key per asset. */
export function assetKey(contract: string | null) {
  return contract ? contract.toLowerCase() : 'ETH'
}
