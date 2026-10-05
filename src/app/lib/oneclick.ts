// NEAR Intents 1Click API: the external route the Shield uses between Solana and Zcash.
// Deposits, amounts and timing on this route are public.
const BASE = 'https://1click.chaindefuser.com/v0'

export type QuoteRequest = {
  dry: boolean
  originAsset: string
  destinationAsset: string
  /** base units of the origin asset */
  amount: string
  refundTo: string
  recipient: string
  /** ISO time after which an unfunded deposit is refunded */
  deadline: string
}

export type Quote = {
  depositAddress?: string
  depositMemo?: string
  amountIn: string
  amountInFormatted: string
  amountInUsd?: string
  amountOut: string
  amountOutFormatted: string
  amountOutUsd?: string
  minAmountOut: string
  timeEstimate?: number
  deadline?: string
}

export type QuoteResponse = { quote: Quote; correlationId?: string }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) throw new Error(body.message ? `Route: ${body.message}` : `Route error ${res.status}`)
  return body as T
}

export function requestQuote(r: QuoteRequest) {
  return call<QuoteResponse>('/quote', {
    method: 'POST',
    body: JSON.stringify({
      dry: r.dry,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: r.originAsset,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: r.destinationAsset,
      amount: r.amount,
      refundTo: r.refundTo,
      refundType: 'ORIGIN_CHAIN',
      recipient: r.recipient,
      recipientType: 'DESTINATION_CHAIN',
      deadline: r.deadline,
    }),
  })
}

export type SwapStatus =
  | 'PENDING_DEPOSIT'
  | 'KNOWN_DEPOSIT_TX'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'INCOMPLETE_DEPOSIT'
  | 'REFUNDED'
  | 'FAILED'
  | (string & {})

export async function getSwapStatus(depositAddress: string) {
  const r = await call<{ status: SwapStatus; swapDetails?: { destinationChainTxHashes?: { hash: string; explorerUrl?: string }[] } }>(
    `/status?depositAddress=${encodeURIComponent(depositAddress)}`,
  )
  return r
}

/** Tells the route about the deposit transaction so it is picked up faster. Optional. */
export function submitDeposit(txHash: string, depositAddress: string) {
  return call('/deposit/submit', { method: 'POST', body: JSON.stringify({ txHash, depositAddress }) }).catch(() => undefined)
}

export const FINAL_STATUSES = new Set(['SUCCESS', 'REFUNDED', 'FAILED'])

export function statusLabel(s: SwapStatus | undefined) {
  switch (s) {
    case 'PENDING_DEPOSIT':
      return 'Waiting for deposit'
    case 'KNOWN_DEPOSIT_TX':
      return 'Deposit seen'
    case 'PROCESSING':
      return 'Crossing'
    case 'SUCCESS':
      return 'Delivered'
    case 'INCOMPLETE_DEPOSIT':
      return 'Deposit too small'
    case 'REFUNDED':
      return 'Refunded'
    case 'FAILED':
      return 'Failed'
    default:
      return s ?? 'Unknown'
  }
}
