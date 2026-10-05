import type { Connection } from '@solana/web3.js'
import { getHistory, getHoldings, isIndexLimited, type Holding, type TxSummary } from './solana'
import type { Token } from './tokens'

export type Counterparty = { address: string; count: number; lastTime: number | null; sent: number; received: number }
export type Flow = { asset: string; decimals: number; in: bigint; out: bigint }

export type ExposureReport = {
  address: string
  holdings: Holding[]
  history: TxSummary[]
  counterparties: Counterparty[]
  flows: Flow[]
  firstSeen: number | null
  lastSeen: number | null
  failed: number
  /** true when the RPC could only report known tokens */
  knownTokensOnly: boolean
}

/** What a stranger with a block explorer learns about an address, computed from public data only. */
export async function scanExposure(conn: Connection, address: string, tokens: Token[], limit = 40): Promise<ExposureReport> {
  const [holdings, history] = await Promise.all([getHoldings(conn, address, tokens), getHistory(conn, address, limit)])
  const parties = new Map<string, Counterparty>()
  const flows = new Map<string, Flow>()
  let firstSeen: number | null = null
  let lastSeen: number | null = null
  let failed = 0

  const flow = (asset: string, decimals: number, delta: bigint) => {
    const f = flows.get(asset) ?? { asset, decimals, in: 0n, out: 0n }
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
    if (t.sol !== 0n) flow('SOL', 9, t.sol)
    for (const d of t.tokens) flow(d.mint, d.decimals, d.delta)
    const outgoing = t.sol < 0n || t.tokens.some((d) => d.delta < 0n)
    for (const c of t.counterparties) {
      const p = parties.get(c) ?? { address: c, count: 0, lastTime: null, sent: 0, received: 0 }
      p.count++
      if (outgoing) p.sent++
      else p.received++
      p.lastTime = Math.max(p.lastTime ?? 0, t.blockTime ?? 0) || null
      parties.set(c, p)
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
    knownTokensOnly: isIndexLimited(conn),
  }
}
