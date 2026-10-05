import { ed25519 } from '@noble/curves/ed25519.js'
import bs58 from 'bs58'
import type { Connection, Keypair } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import { NETWORKS, type NetworkId } from '../config'
import { canonical, decodeJson, encodeJson, utf8 } from './codec'
import { getParsedTx, summarize } from './solana'

export type ProofBody = {
  v: 1
  kind: 'sotto-payment-proof'
  net: NetworkId
  tx: string
  /** the address that received the payment and signs this proof */
  recipient: string
  /** where the money came from, as recorded on-chain */
  from: string[]
  /** 'SOL' or the token mint */
  asset: string
  /** base units */
  amount: string
  blockTime: number | null
  statement?: string
  issuedAt: number
}

export type Proof = { body: ProofBody; sig: string }

export function proofMessage(body: ProofBody) {
  return utf8(`Sotto payment proof\n${canonical(body)}`)
}

export function signWithKeypair(body: ProofBody, kp: Keypair): Proof {
  if (kp.publicKey.toBase58() !== body.recipient) throw new Error('This key does not control the receiving address.')
  const sig = ed25519.sign(proofMessage(body), kp.secretKey.slice(0, 32))
  return { body, sig: bs58.encode(sig) }
}

export async function signWithWallet(body: ProofBody, signMessage: (m: Uint8Array) => Promise<Uint8Array>): Promise<Proof> {
  const sig = await signMessage(proofMessage(body))
  return { body, sig: bs58.encode(sig) }
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
    throw new Error('This is not a Sotto proof.')
  }
  if (p?.body?.kind !== 'sotto-payment-proof' || p.body.v !== 1 || !NETWORKS.includes(p.body.net)) {
    throw new Error('This is not a Sotto proof.')
  }
  return p
}

export type Check = { label: string; ok: boolean; detail?: string }

/** Verifies the signature locally, then re-reads the transaction from the chain. */
export async function verifyProof(conn: Connection, p: Proof): Promise<Check[]> {
  const b = p.body
  const checks: Check[] = []
  let sigOk = false
  try {
    sigOk = ed25519.verify(bs58.decode(p.sig), proofMessage(b), new PublicKey(b.recipient).toBytes())
  } catch {
    sigOk = false
  }
  checks.push({
    label: 'Signed by the receiving address',
    ok: sigOk,
    detail: sigOk ? 'Only the holder of that address could have produced this signature.' : 'The signature does not match.',
  })

  const tx = await getParsedTx(conn, b.tx).catch(() => null)
  if (!tx) {
    checks.push({ label: 'Transaction found on-chain', ok: false, detail: 'The RPC could not find this transaction on this network.' })
    return checks
  }
  checks.push({ label: 'Transaction found on-chain', ok: !tx.meta?.err, detail: tx.meta?.err ? 'The transaction failed on-chain.' : undefined })

  const s = summarize(tx, b.tx, b.recipient)
  const received = b.asset === 'SOL' ? s.sol : (s.tokens.find((t) => t.mint === b.asset)?.delta ?? 0n)
  checks.push({
    label: 'Amount received matches',
    ok: received === BigInt(b.amount),
    detail: received === BigInt(b.amount) ? undefined : 'The chain shows a different amount for this address.',
  })
  const fromOk = b.from.length > 0 && b.from.every((f) => s.counterparties.includes(f))
  checks.push({ label: 'Sender matches the chain', ok: fromOk, detail: fromOk ? undefined : 'The sender listed is not the one on-chain.' })
  checks.push({ label: 'Time matches the chain', ok: (tx.blockTime ?? null) === b.blockTime })
  return checks
}
