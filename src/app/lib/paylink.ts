import { NETWORKS, CHAIN_ID, type NetworkId } from '../config'
import { isAddress } from './chain'
import { decodeJson, encodeJson } from './codec'
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
  /** note shown to the payer (public: it travels in the link) */
  note?: string
}

export function decodePayRequest(code: string): { request: PayRequest; token: Token } {
  let r: PayRequest
  try {
    r = decodeJson<PayRequest>(code)
  } catch {
    throw new Error('This pay link is incomplete or damaged.')
  }
  if (r?.v !== 1 || !NETWORKS.includes(r.net) || !isAddress(r.to)) throw new Error('This pay link is not valid.')
  const token = tokenBySymbol(r.net, r.token)
  if (!token) throw new Error(`This pay link asks for ${r.token}, which is not supported.`)
  if (r.amount !== undefined && !/^\d+$/.test(r.amount)) throw new Error('This pay link has an invalid amount.')
  if (r.note) r.note = r.note.slice(0, 120)
  return { request: r, token }
}

export function payLinkUrl(origin: string, r: PayRequest) {
  return `${origin}/pay/${encodeJson(r)}`
}

/** Extracts a pay request from a full Zephyra OS link or a bare code. Returns null if it is not one. */
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

/** EIP-681 payment URI, readable by mobile Ethereum wallets that scan QR codes. */
export function paymentUri(r: PayRequest, token: Token) {
  if (!token.contract) return `ethereum:${r.to}@${CHAIN_ID}${r.amount ? `?value=${r.amount}` : ''}`
  return `ethereum:${token.contract}@${CHAIN_ID}/transfer?address=${r.to}${r.amount ? `&uint256=${r.amount}` : ''}`
}
