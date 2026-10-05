import { useEffect, useRef } from 'react'
import { FINAL_STATUSES, getSwapStatus, type SwapStatus } from '../lib/oneclick'
import { useStored } from '../lib/storage'
import { keys } from './keys'
import { useWallet } from './wallet'

export type SwapRecord = {
  id: string
  direction: 'toZcash' | 'toSolana'
  createdAt: number
  depositAddress: string
  depositMemo?: string
  assetIn: string
  amountIn: string
  amountOut: string
  recipient: string
  refundTo: string
  deadline: string
  /** Solana deposit transaction, for Solana to Zcash */
  txSig?: string
  status?: SwapStatus
  outHashes?: string[]
}

const EMPTY: SwapRecord[] = []

export function useSwaps() {
  const { address } = useWallet()
  return useStored(address ? keys.swaps(address) : null, EMPTY)
}

/** Polls the route for every swap that has not reached a final state. */
export function useSwapWatcher(swaps: SwapRecord[], setSwaps: (u: (prev: SwapRecord[]) => SwapRecord[]) => void) {
  const latest = useRef(swaps)
  useEffect(() => {
    latest.current = swaps
  })
  const watchKey = swaps
    .filter((s) => !FINAL_STATUSES.has(s.status ?? ''))
    .map((s) => s.id)
    .join(',')

  useEffect(() => {
    if (!watchKey) return
    const ids = new Set(watchKey.split(','))
    const check = async () => {
      for (const s of latest.current.filter((x) => ids.has(x.id))) {
        if (document.hidden) return
        try {
          const r = await getSwapStatus(s.depositAddress)
          const outHashes = r.swapDetails?.destinationChainTxHashes?.map((h) => h.hash)
          setSwaps((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: r.status, outHashes: outHashes?.length ? outHashes : x.outHashes } : x)))
        } catch {
          // not indexed yet, or the route is busy: retry next tick
        }
      }
    }
    void check()
    const t = window.setInterval(check, 15_000)
    return () => window.clearInterval(t)
  }, [watchKey, setSwaps])
}
