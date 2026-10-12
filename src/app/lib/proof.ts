import type { Hex, PublicClient } from 'viem'
import type { PrivateKeyAccount } from 'viem/accounts'
import { NETWORKS, type NetworkId } from '../config'
import { sameAddress, summarizeTx } from './chain'
import { canonical, decodeJson, encodeJson } from './codec'

export type ProofBody = {
  v: 1
  kind: 'zephyra-payment-proof'
  net: NetworkId
  tx: Hex
  /** the address that received the payment and signs this proof */
  recipient: string
  /** where the money came from, as recorded on-chain */
  from: string[]
  /** 'ETH' or the token contract (lower case) */
  asset: string
  /** base units */
  amount: string
  blockTime: number | null
  statement?: string
  issuedAt: number
}

export type Proof = { body: ProofBody; sig: Hex }

export function proofMessage(body: ProofBody) {
  return `Zephyra OS payment proof\n${canonical(body)}`
}

export async function signWithAccount(body: ProofBody, account: PrivateKeyAccount): Promise<Proof> {
  if (!sameAddress(account.address, body.recipient)) throw new Error('This key does not control the receiving address.')
  return { body, sig: await account.signMessage({ message: proofMessage(body) }) }
}

export async function signWithWallet(body: ProofBody, signMessage: (m: string) => Promise<Hex>): Promise<Proof> {
  return { body, sig: await signMessage(proofMessage(body)) }
}

export function encodeProof(p: Proof) {
  return encodeJson(p)
}

export function decodeProof(input: string): Proof {
  const s = input.trim()
  const m = s.match(/\/proof\/([A-Za-z0-9_-]+)/)
  let p: Proof
  try {
    p = s.startsWith('{') ? (JSON.parse(s) as Proof) : decodeJson<Proof>(m ? m[1] : s)
  } catch {
    throw new Error('This is not a Zephyra OS proof.')
  }
  if (p?.body?.kind !== 'zephyra-payment-proof' || p.body.v !== 1 || !NETWORKS.includes(p.body.net)) {
    throw new Error('This is not a Zephyra OS proof.')
  }
  return p
}

export type Check = { label: string; ok: boolean; detail?: string }

/** Checks the signature (regular and smart-contract wallets), then re-reads the transaction from the chain. */
export async function verifyProof(client: PublicClient, p: Proof): Promise<Check[]> {
  const b = p.body
  const checks: Check[] = []
  let sigOk = false
  try {
    sigOk = await client.verifyMessage({ address: b.recipient as Hex, message: proofMessage(b), signature: p.sig })
  } catch {
    sigOk = false
  }
  checks.push({
    label: 'Signed by the receiving address',
    ok: sigOk,
    detail: sigOk ? 'Only the holder of that address could have produced this signature.' : 'The signature does not match.',
  })

  let s
  try {
    s = await summarizeTx(client, b.tx, b.recipient)
  } catch {
    checks.push({ label: 'Transaction found on-chain', ok: false, detail: 'The RPC could not find this transaction.' })
    return checks
  }
  checks.push({ label: 'Transaction found on-chain', ok: s.ok, detail: s.ok ? undefined : 'The transaction reverted on-chain.' })
  const received = b.asset === 'ETH' ? s.eth : (s.tokens.find((t) => t.contract === b.asset.toLowerCase())?.delta ?? 0n)
  checks.push({
    label: 'Amount received matches',
    ok: received === BigInt(b.amount),
    detail: received === BigInt(b.amount) ? undefined : 'The chain shows a different amount for this address.',
  })
  const fromOk = b.from.length > 0 && b.from.every((f) => s.counterparties.some((c) => sameAddress(c, f)))
  checks.push({ label: 'Sender matches the chain', ok: fromOk, detail: fromOk ? undefined : 'The sender listed is not the one on-chain.' })
  checks.push({ label: 'Time matches the chain', ok: s.blockTime === b.blockTime })
  return checks
}
