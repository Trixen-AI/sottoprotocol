import type { NetworkId } from '../config'

export type Token = {
  symbol: string
  name: string
  /** null for native SOL */
  mint: string | null
  decimals: number
  coingeckoId?: string
  /** NEAR Intents 1Click asset id for this token on Solana, when the route supports it */
  oneClickAsset?: string
}

export const SOL: Token = {
  symbol: 'SOL',
  name: 'Solana',
  mint: null,
  decimals: 9,
  coingeckoId: 'solana',
  oneClickAsset: 'nep141:sol.omft.near',
}

// Mints checked on-chain: USDC and ZEC are SPL Token program mints (6 and 8 decimals).
// The ZEC mint is the one NEAR Intents 1Click lists for ZEC on Solana.
const MAINNET: Token[] = [
  SOL,
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    coingeckoId: 'usd-coin',
    oneClickAsset: 'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near',
  },
  {
    symbol: 'ZEC',
    name: 'Zcash on Solana',
    mint: 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS',
    decimals: 8,
    coingeckoId: 'zcash',
    oneClickAsset: '1cs_v1:sol:spl:A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS',
  },
]

export const TOKENS: Record<NetworkId, Token[]> = { mainnet: MAINNET }

/** Native ZEC on the Zcash chain, as a 1Click asset. */
export const ZEC_NATIVE_ASSET = 'nep141:zec.omft.near'
export const ZEC_DECIMALS = 8

export function tokenBySymbol(network: NetworkId, symbol: string) {
  return TOKENS[network].find((t) => t.symbol === symbol)
}

export function tokenByMint(network: NetworkId, mint: string | null) {
  return TOKENS[network].find((t) => t.mint === mint)
}

export function tokenKey(t: Pick<Token, 'mint'>) {
  return t.mint ?? 'SOL'
}
