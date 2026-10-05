import type { Prices } from './prices'
import { priceOf } from './prices'
import type { Holding } from './solana'
import type { Token } from './tokens'

export type Row = { token: Token; raw: bigint; usd?: number }

/** Known-token rows (always listed, even at zero) plus the USD total of what has a price. */
export function valueRows(holdings: Holding[] | undefined, tokens: Token[], prices: Prices | undefined) {
  const rows: Row[] = tokens.map((token) => {
    const raw = holdings?.find((h) => h.mint === token.mint)?.raw ?? 0n
    const p = priceOf(prices, token)
    return { token, raw, usd: p === undefined ? undefined : (Number(raw) / 10 ** token.decimals) * p }
  })
  const known = new Set(tokens.map((t) => t.mint))
  const otherCount = holdings?.filter((h) => !known.has(h.mint)).length ?? 0
  const total = rows.some((r) => r.usd !== undefined) ? rows.reduce((s, r) => s + (r.usd ?? 0), 0) : undefined
  return { rows, total, otherCount }
}

export function sumHoldings(all: Record<string, Holding[]> | undefined): Holding[] {
  const byMint = new Map<string | null, Holding>()
  for (const list of Object.values(all ?? {})) {
    for (const h of list) {
      const prev = byMint.get(h.mint)
      byMint.set(h.mint, { mint: h.mint, decimals: h.decimals, raw: (prev?.raw ?? 0n) + h.raw })
    }
  }
  return [...byMint.values()]
}
