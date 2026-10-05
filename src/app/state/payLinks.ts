import { useEffect, useRef } from 'react'
import { getParsedTx, getSignatures, summarize } from '../lib/solana'
import { useStored } from '../lib/storage'
import { tokenBySymbol } from '../lib/tokens'
import type { NetworkId } from '../config'
import { keys } from './keys'
import { useSolana } from './solana'
import { useWallet } from './wallet'

export type Payment = { sig: string; amount: string; from: string[]; blockTime: number | null }

export type PayLink = {
  id: string
  net: NetworkId
  /** fresh address index in the vault */
  index: number
  address: string
  token: string
  amount?: string
  ref: string
  note?: string
  /** private label, only on this device */
  label?: string
  createdAt: number
  payments: Payment[]
  /** signatures already inspected */
  seen: string[]
  archived?: boolean
}

const EMPTY: PayLink[] = []

export function usePayLinks() {
  const { address } = useWallet()
  const { network } = useSolana()
  return useStored(address ? keys.payLinks(address, network) : null, EMPTY)
}

export function receivedTotal(l: PayLink) {
  return l.payments.reduce((sum, p) => sum + BigInt(p.amount), 0n)
}

export type LinkStatus = 'open' | 'partial' | 'paid'

export function linkStatus(l: PayLink): LinkStatus {
  if (!l.payments.length) return 'open'
  if (!l.amount) return 'paid'
  return receivedTotal(l) >= BigInt(l.amount) ? 'paid' : 'partial'
}

const POLL_MS = 12_000

/** Watches the fresh address behind each open pay link and records incoming payments. */
export function usePayLinkWatcher(links: PayLink[], setLinks: (u: (prev: PayLink[]) => PayLink[]) => void) {
  const { connection, network } = useSolana()
  const latest = useRef(links)
  useEffect(() => {
    latest.current = links
  })
  const watchKey = links
    .filter((l) => !l.archived && linkStatus(l) !== 'paid')
    .map((l) => l.id)
    .join(',')

  useEffect(() => {
    if (!watchKey) return
    const ids = new Set(watchKey.split(','))
    let stopped = false

    const check = async () => {
      for (const link of latest.current.filter((l) => ids.has(l.id))) {
        if (stopped || document.hidden) return
        const token = tokenBySymbol(network, link.token)
        if (!token) continue
        try {
          const sigs = await getSignatures(connection, link.address, 10)
          const fresh = sigs.filter((s) => !s.err && !link.seen.includes(s.signature))
          if (!fresh.length) continue
          const payments: Payment[] = []
          for (const s of fresh) {
            const tx = await getParsedTx(connection, s.signature)
            if (!tx) continue
            const sum = summarize(tx, s.signature, link.address)
            const delta = token.mint ? (sum.tokens.find((t) => t.mint === token.mint)?.delta ?? 0n) : sum.sol
            if (delta > 0n) payments.push({ sig: s.signature, amount: delta.toString(), from: sum.counterparties, blockTime: sum.blockTime })
          }
          const seenNow = fresh.map((s) => s.signature)
          setLinks((prev) =>
            prev.map((l) =>
              l.id === link.id
                ? {
                    ...l,
                    payments: [...l.payments, ...payments.filter((p) => !l.payments.some((q) => q.sig === p.sig))],
                    seen: [...seenNow, ...l.seen].slice(0, 60),
                  }
                : l,
            ),
          )
        } catch {
          // RPC hiccup: try again on the next tick
        }
      }
    }

    void check()
    const timer = window.setInterval(check, POLL_MS)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [watchKey, connection, network, setLinks])
}
