import type { Hex } from 'viem'
import { BLOCKSCOUT_API } from '../config'
import type { Holding, TokenDelta, TxSummary } from './chain'
import { tokenByContract } from './tokens'

// Blockscout's public Ethereum API: address history and token lists, which a plain RPC cannot give.

type Party = { hash: string } | null

type BsTx = {
  hash: Hex
  from: Party
  to: Party
  value: string
  timestamp: string | null
  status: 'ok' | 'error' | null
}

type BsTransfer = {
  transaction_hash: Hex
  from: Party
  to: Party
  token: { address_hash?: string; address?: string; symbol?: string | null; decimals?: string | null; type?: string }
  total: { value?: string; decimals?: string | null } | null
  timestamp: string | null
}

type BsBalance = {
  value: string
  token: { address_hash?: string; address?: string; symbol?: string | null; decimals?: string | null; type?: string }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BLOCKSCOUT_API}${path}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`Indexer error ${res.status}`)
  return (await res.json()) as T
}

const lower = (s: string | undefined | null) => (s ?? '').toLowerCase()
const toUnix = (iso: string | null) => (iso ? Math.floor(Date.parse(iso) / 1000) : null)

/** Recent history for an address: ETH transfers and ERC-20 transfers merged per transaction. */
export async function getHistory(address: string, limit = 25): Promise<TxSummary[]> {
  const a = lower(address)
  const [txs, transfers] = await Promise.all([
    get<{ items: BsTx[] }>(`/addresses/${address}/transactions`),
    get<{ items: BsTransfer[] }>(`/addresses/${address}/token-transfers?type=ERC-20`),
  ])
  type Draft = Omit<TxSummary, 'counterparties' | 'tokens'> & { counterparties: Set<string>; tokens: Map<string, TokenDelta> }
  const byHash = new Map<string, Draft>()
  const draft = (hash: Hex, from: string, time: number | null, ok: boolean) => {
    let d = byHash.get(hash)
    if (!d) {
      d = { hash, blockTime: time, ok, from, eth: 0n, tokens: new Map(), counterparties: new Set() }
      byHash.set(hash, d)
    }
    return d
  }

  for (const t of txs.items ?? []) {
    const d = draft(t.hash, t.from?.hash ?? '', toUnix(t.timestamp), t.status !== 'error')
    d.ok = t.status !== 'error'
    const value = BigInt(t.value || '0')
    if (value === 0n) continue
    if (lower(t.to?.hash) === a) {
      d.eth += value
      if (t.from) d.counterparties.add(t.from.hash)
    }
    if (lower(t.from?.hash) === a) {
      d.eth -= value
      if (t.to) d.counterparties.add(t.to.hash)
    }
  }

  for (const t of transfers.items ?? []) {
    const contract = lower(t.token.address_hash ?? t.token.address)
    const raw = BigInt(t.total?.value ?? '0')
    if (!contract || raw === 0n) continue
    const d = draft(t.transaction_hash, t.from?.hash ?? '', toUnix(t.timestamp), true)
    let delta = 0n
    if (lower(t.to?.hash) === a) {
      delta += raw
      if (t.from) d.counterparties.add(t.from.hash)
    }
    if (lower(t.from?.hash) === a) {
      delta -= raw
      if (t.to) d.counterparties.add(t.to.hash)
    }
    if (delta === 0n) continue
    const known = tokenByContract('mainnet', contract)
    const decimals = known?.decimals ?? Number(t.total?.decimals ?? t.token.decimals ?? 18)
    const prev = d.tokens.get(contract)
    d.tokens.set(contract, { contract, delta: (prev?.delta ?? 0n) + delta, decimals, symbol: known?.symbol ?? t.token.symbol ?? undefined })
  }

  return [...byHash.values()]
    .map((d) => ({
      ...d,
      tokens: [...d.tokens.values()],
      counterparties: [...d.counterparties].filter((c) => lower(c) !== a),
    }))
    .sort((x, y) => (y.blockTime ?? Infinity) - (x.blockTime ?? Infinity))
    .slice(0, limit)
}

/** Every ERC-20 balance the indexer knows for an address. */
export async function getTokenBalances(address: string): Promise<Holding[]> {
  const items = await get<BsBalance[]>(`/addresses/${address}/token-balances`)
  return items
    .filter((b) => (b.token.type ?? 'ERC-20') === 'ERC-20')
    .map((b) => ({
      contract: lower(b.token.address_hash ?? b.token.address),
      raw: BigInt(b.value || '0'),
      decimals: Number(b.token.decimals ?? 18),
      symbol: b.token.symbol ?? undefined,
    }))
    .filter((h) => h.contract)
}
