import type { PublicClient } from 'viem'
import { getHistory } from './blockscout'
import { getHoldings, isTokenListPartial, type Holding, type TxSummary } from './chain'
import type { Token } from './tokens'

export type Counterparty = { address: string; count: number; lastTime: number | null; sent: number; received: number }
export type Flow = { asset: string; symbol?: string; decimals: number; in: bigint; out: bigint }

export type ExposureReport = {
  address: string
  holdings: Holding[]
  history: TxSummary[]
  counterparties: Counterparty[]
  flows: Flow[]
  firstSeen: number | null
  lastSeen: number | null
  failed: number
  /** true when only the known tokens could be read */
  knownTokensOnly: boolean
}

/** What a stranger with a block explorer learns about an address, computed from public data only. */
export async function scanExposure(client: PublicClient, address: string, tokens: Token[], limit = 50): Promise<ExposureReport> {
  const [holdings, history] = await Promise.all([getHoldings(client, address, tokens), getHistory(address, limit)])
  const parties = new Map<string, Counterparty>()
  const flows = new Map<string, Flow>()
  let firstSeen: number | null = null
  let lastSeen: number | null = null
  let failed = 0

  const flow = (asset: string, decimals: number, delta: bigint, symbol?: string) => {
    const f = flows.get(asset) ?? { asset, symbol, decimals, in: 0n, out: 0n }
    if (delta > 0n) f.in += delta
    else f.out -= delta
    flows.set(asset, f)
  }

  for (const t of history) {
    if (!t.ok) {
      failed++
      continue
    }
    if (t.blockTime) {
      firstSeen = firstSeen === null ? t.blockTime : Math.min(firstSeen, t.blockTime)
      lastSeen = lastSeen === null ? t.blockTime : Math.max(lastSeen, t.blockTime)
    }
    if (t.eth !== 0n) flow('ETH', 18, t.eth, 'ETH')
    for (const d of t.tokens) flow(d.contract, d.decimals, d.delta, d.symbol)
    const outgoing = t.eth < 0n || t.tokens.some((d) => d.delta < 0n)
    for (const c of t.counterparties) {
      const key = c.toLowerCase()
      const p = parties.get(key) ?? { address: c, count: 0, lastTime: null, sent: 0, received: 0 }
      p.count++
      if (outgoing) p.sent++
      else p.received++
      p.lastTime = Math.max(p.lastTime ?? 0, t.blockTime ?? 0) || null
      parties.set(key, p)
    }
  }

  return {
    address,
    holdings,
    history,
    counterparties: [...parties.values()].sort((a, b) => b.count - a.count),
    flows: [...flows.values()],
    firstSeen,
    lastSeen,
    failed,
    knownTokensOnly: isTokenListPartial(address),
  }
}
