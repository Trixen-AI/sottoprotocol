import { useEffect, useRef } from 'react'
import { getHistory } from '../lib/blockscout'
import { useStored } from '../lib/storage'
import { assetKey, tokenBySymbol } from '../lib/tokens'
import type { NetworkId } from '../config'
import type { TxSummary } from '../lib/chain'
import type { Token } from '../lib/tokens'
import { keys } from './keys'
import { useChain } from './chain'
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
  note?: string
  /** private label, only on this device */
  label?: string
  createdAt: number
  payments: Payment[]
  /** transactions already inspected */
  seen: string[]
  archived?: boolean
}

const EMPTY: PayLink[] = []

export function usePayLinks() {
  const { address } = useWallet()
  const { network } = useChain()
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

/** Confirmed incoming amounts of one token in a list of transaction summaries. */
export function incomingPayments(history: TxSummary[], token: Token): Payment[] {
  const key = assetKey(token.contract)
  return history.flatMap((t) => {
    if (!t.ok || t.blockTime === null) return []
    const delta = token.contract ? (t.tokens.find((d) => d.contract === key)?.delta ?? 0n) : t.eth
    return delta > 0n ? [{ sig: t.hash, amount: delta.toString(), from: t.counterparties, blockTime: t.blockTime }] : []
  })
}

const POLL_MS = 12_000

/** Watches the fresh address behind each open pay link and records incoming payments. */
export function usePayLinkWatcher(links: PayLink[], setLinks: (u: (prev: PayLink[]) => PayLink[]) => void) {
  const { network } = useChain()
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
          const history = await getHistory(link.address, 20)
          const fresh = incomingPayments(history, token).filter((p) => !link.seen.includes(p.sig))
          if (!fresh.length) continue
          setLinks((prev) =>
            prev.map((l) =>
              l.id === link.id
                ? {
                    ...l,
                    payments: [...l.payments, ...fresh.filter((p) => !l.payments.some((q) => q.sig === p.sig))],
                    seen: [...fresh.map((p) => p.sig), ...l.seen].slice(0, 60),
                  }
                : l,
            ),
          )
        } catch {
          // indexer hiccup: try again on the next tick
        }
      }
    }

    void check()
    const timer = window.setInterval(check, POLL_MS)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [watchKey, network, setLinks])
}
