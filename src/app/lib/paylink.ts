import { NETWORKS, type NetworkId } from '../config'
import { decodeJson, encodeJson } from './codec'
import { fromBase } from './format'
import { isAddress } from './solana'
import { tokenBySymbol, type Token } from './tokens'

/** Everything a payer needs, carried in the link itself: no server holds it. */
export type PayRequest = {
  v: 1
  net: NetworkId
  /** fresh destination address */
  to: string
  token: string
  /** base units, omitted when the payer chooses the amount */
  amount?: string
  /** Solana Pay reference key */
  ref: string
  /** note shown to the payer (public: it travels in the link) */
  note?: string
}

export function encodePayRequest(r: PayRequest) {
  return encodeJson(r)
}

export function decodePayRequest(code: string): { request: PayRequest; token: Token } {
  let r: PayRequest
  try {
    r = decodeJson<PayRequest>(code)
  } catch {
    throw new Error('This pay link is incomplete or damaged.')
  }
  if (r?.v !== 1 || !NETWORKS.includes(r.net) || !isAddress(r.to) || !isAddress(r.ref)) {
    throw new Error('This pay link is not valid.')
  }
  const token = tokenBySymbol(r.net, r.token)
  if (!token) throw new Error(`This pay link asks for ${r.token}, which is not supported on this network.`)
  if (r.amount !== undefined && !/^\d+$/.test(r.amount)) throw new Error('This pay link has an invalid amount.')
  if (r.note) r.note = r.note.slice(0, 120)
  return { request: r, token }
}

export function payLinkUrl(origin: string, r: PayRequest) {
  return `${origin}/pay/${encodePayRequest(r)}`
}

/** Extracts a pay request from a full Sotto link or a bare code. Returns null if it is not one. */
export function parsePayLink(input: string) {
  const s = input.trim()
  const m = s.match(/\/pay\/([A-Za-z0-9_-]+)/)
  const code = m ? m[1] : /^[A-Za-z0-9_-]{40,}$/.test(s) ? s : null
  if (!code) return null
  try {
    return decodePayRequest(code)
  } catch {
    return null
  }
}

/** Solana Pay transfer request URL, readable by mobile wallets that scan QR codes. */
export function solanaPayUrl(r: PayRequest, token: Token) {
  const q = new URLSearchParams()
  if (r.amount) q.set('amount', fromBase(BigInt(r.amount), token.decimals).replace(/,/g, ''))
  if (token.mint) q.set('spl-token', token.mint)
  q.set('reference', r.ref)
  q.set('label', 'Sotto')
  if (r.note) q.set('message', r.note)
  return `solana:${r.to}?${q.toString()}`
}

