import type { Holding } from './chain'
import type { Prices } from './prices'
import { priceOf } from './prices'
import { assetKey, type Token } from './tokens'

export type Row = { token: Token; raw: bigint; usd?: number }

/** Known-token rows (always listed, even at zero) plus the USD total of what has a price. */
export function valueRows(holdings: Holding[] | undefined, tokens: Token[], prices: Prices | undefined) {
  const rows: Row[] = tokens.map((token) => {
    const raw = holdings?.find((h) => assetKey(h.contract) === assetKey(token.contract))?.raw ?? 0n
    const p = priceOf(prices, token)
    return { token, raw, usd: p === undefined ? undefined : (Number(raw) / 10 ** token.decimals) * p }
  })
  const known = new Set(tokens.map((t) => assetKey(t.contract)))
  const otherCount = holdings?.filter((h) => !known.has(assetKey(h.contract))).length ?? 0
  const total = rows.some((r) => r.usd !== undefined) ? rows.reduce((s, r) => s + (r.usd ?? 0), 0) : undefined
  return { rows, total, otherCount }
}

export function sumHoldings(all: Record<string, Holding[]> | undefined): Holding[] {
  const byAsset = new Map<string, Holding>()
  for (const list of Object.values(all ?? {})) {
    for (const h of list) {
      const key = assetKey(h.contract)
      const prev = byAsset.get(key)
      byAsset.set(key, { ...h, raw: (prev?.raw ?? 0n) + h.raw })
    }
  }
  return [...byAsset.values()]
}
