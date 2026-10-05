import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type ParsedInstruction,
  type ParsedTransactionWithMeta,
  type PartiallyDecodedInstruction,
} from '@solana/web3.js'
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import type { Token } from './tokens'

/** Smallest balance a brand-new system account must hold (rent exemption for 0 bytes). */
export const RENT_EXEMPT_MIN = 890_880n
export const BASE_FEE = 5_000n

const connections = new Map<string, Connection>()

export function getConnection(rpc: string) {
  let c = connections.get(rpc)
  if (!c) {
    c = new Connection(rpc, { commitment: 'confirmed' })
    connections.set(rpc, c)
  }
  return c
}

export function isAddress(value: string) {
  const s = value.trim()
  if (s.length < 32 || s.length > 44) return false
  try {
    return new PublicKey(s).toBase58() === s
  } catch {
    return false
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

// ---------- balances ----------

export type Holding = { mint: string | null; raw: bigint; decimals: number }

type ParsedTokenInfo = { mint: string; tokenAmount: { amount: string; decimals: number } }

/** RPC endpoints that refuse owner-indexed token queries (free public tiers often do). */
const indexLimited = new Set<string>()

export function isIndexLimited(conn: Connection) {
  return indexLimited.has(conn.rpcEndpoint)
}

/**
 * Balances for an owner. Tries the full token listing; if the endpoint refuses it, reads the
 * standard token account of each known token directly, which every RPC allows.
 */
export async function getHoldings(conn: Connection, owner: string, known: Token[]): Promise<Holding[]> {
  const pk = new PublicKey(owner)
  const lamportsP = conn.getBalance(pk)
  const byMint = new Map<string, Holding>()
  const add = (info: ParsedTokenInfo) => {
    const prev = byMint.get(info.mint)
    byMint.set(info.mint, { mint: info.mint, decimals: info.tokenAmount.decimals, raw: (prev?.raw ?? 0n) + BigInt(info.tokenAmount.amount) })
  }

  let listed = false
  if (!indexLimited.has(conn.rpcEndpoint)) {
    try {
      const [classic, t22] = await Promise.all([
        conn.getParsedTokenAccountsByOwner(pk, { programId: TOKEN_PROGRAM_ID }),
        conn.getParsedTokenAccountsByOwner(pk, { programId: TOKEN_2022_PROGRAM_ID }).catch(() => ({ value: [] })),
      ])
      for (const { account } of [...classic.value, ...t22.value]) add((account.data as { parsed: { info: ParsedTokenInfo } }).parsed.info)
      listed = true
    } catch (e) {
      if (!/blocked|personal token|not allowed|forbidden|403|-32601|-32602/i.test(String(e))) throw e
      indexLimited.add(conn.rpcEndpoint)
    }
  }
  if (!listed) {
    const withMint = known.filter((t): t is Token & { mint: string } => Boolean(t.mint))
    const programs = await Promise.all(withMint.map((t) => getMintProgram(conn, t.mint)))
    const atas = withMint.map((t, i) => getAssociatedTokenAddressSync(new PublicKey(t.mint), pk, true, programs[i]))
    const { value } = await conn.getMultipleParsedAccounts(atas)
    for (const acc of value) {
      const data = acc?.data
      if (data && 'parsed' in data) add((data.parsed as { info: ParsedTokenInfo }).info)
    }
  }
  const lamports = await lamportsP
  return [{ mint: null, raw: BigInt(lamports), decimals: 9 }, ...[...byMint.values()].filter((h) => h.raw > 0n)]
}

export function holdingOf(holdings: Holding[] | undefined, token: Pick<Token, 'mint'>) {
  return holdings?.find((h) => h.mint === token.mint)?.raw ?? 0n
}

// ---------- history ----------

export type TokenDelta = { mint: string; delta: bigint; decimals: number }

export type TxSummary = {
  signature: string
  blockTime: number | null
  ok: boolean
  feePayer: string
  fee: bigint
  /** lamport change for the address, with the fee added back when it paid it */
  sol: bigint
  tokens: TokenDelta[]
  /** addresses on the other side of this address's transfers */
  counterparties: string[]
}

type AnyIx = ParsedInstruction | PartiallyDecodedInstruction

function allInstructions(tx: ParsedTransactionWithMeta): AnyIx[] {
  const inner = tx.meta?.innerInstructions?.flatMap((i) => i.instructions as AnyIx[]) ?? []
  return [...(tx.transaction.message.instructions as AnyIx[]), ...inner]
}

export function summarize(tx: ParsedTransactionWithMeta, signature: string, address: string): TxSummary {
  const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58())
  const meta = tx.meta
  const idx = keys.indexOf(address)
  const fee = BigInt(meta?.fee ?? 0)
  const feePayer = keys[0]
  let sol = 0n
  if (meta && idx >= 0) {
    sol = BigInt(meta.postBalances[idx]) - BigInt(meta.preBalances[idx])
    if (feePayer === address) sol += fee
  }
  const counter = new Set<string>()

  for (const ix of allInstructions(tx)) {
    if (!('parsed' in ix) || ix.program !== 'system') continue
    const p = ix.parsed as { type?: string; info?: { source?: string; destination?: string } }
    if (p.type !== 'transfer' && p.type !== 'transferWithSeed') continue
    const { source, destination } = p.info ?? {}
    if (source === address && destination) counter.add(destination)
    if (destination === address && source) counter.add(source)
  }

  // token balance changes per owner, per mint
  type Row = { pre: bigint; post: bigint; decimals: number }
  const rows = new Map<string, Map<string, Row>>()
  const put = (owner: string | undefined, mint: string, amount: string, decimals: number, which: 'pre' | 'post') => {
    if (!owner) return
    const byMint = rows.get(owner) ?? new Map<string, Row>()
    const r = byMint.get(mint) ?? { pre: 0n, post: 0n, decimals }
    r[which] += BigInt(amount)
    byMint.set(mint, r)
    rows.set(owner, byMint)
  }
  for (const b of meta?.preTokenBalances ?? []) put(b.owner, b.mint, b.uiTokenAmount.amount, b.uiTokenAmount.decimals, 'pre')
  for (const b of meta?.postTokenBalances ?? []) put(b.owner, b.mint, b.uiTokenAmount.amount, b.uiTokenAmount.decimals, 'post')

  const tokens: TokenDelta[] = []
  for (const [mint, r] of rows.get(address) ?? []) {
    const delta = r.post - r.pre
    if (delta === 0n) continue
    tokens.push({ mint, delta, decimals: r.decimals })
    for (const [owner, byMint] of rows) {
      if (owner === address) continue
      const o = byMint.get(mint)
      if (o && (o.post - o.pre) * delta < 0n) counter.add(owner)
    }
  }

  return {
    signature,
    blockTime: tx.blockTime ?? null,
    ok: !meta?.err,
    feePayer,
    fee,
    sol,
    tokens,
    counterparties: [...counter],
  }
}

export async function getParsedTx(conn: Connection, signature: string) {
  return conn.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })
}

export async function getHistory(conn: Connection, address: string, limit = 25): Promise<TxSummary[]> {
  const sigs = await conn.getSignaturesForAddress(new PublicKey(address), { limit })
  const txs = await mapLimit(sigs, 3, (s) => getParsedTx(conn, s.signature).catch(() => null))
  return txs.flatMap((tx, i) => (tx ? [summarize(tx, sigs[i].signature, address)] : []))
}

export async function getSignatures(conn: Connection, address: string, limit = 10) {
  return conn.getSignaturesForAddress(new PublicKey(address), { limit })
}

// ---------- transfers ----------

const mintPrograms = new Map<string, PublicKey>()

export async function getMintProgram(conn: Connection, mint: string) {
  const cached = mintPrograms.get(mint)
  if (cached) return cached
  const info = await conn.getAccountInfo(new PublicKey(mint))
  if (!info) throw new Error('Token mint not found on this network')
  mintPrograms.set(mint, info.owner)
  return info.owner
}

export type TransferArgs = {
  from: string
  to: string
  token: Token
  amount: bigint
  /** Solana Pay reference key, added read-only so the payment can be found by it */
  reference?: string
}

export async function buildTransfer(conn: Connection, a: TransferArgs) {
  const from = new PublicKey(a.from)
  const to = new PublicKey(a.to)
  const tx = new Transaction()
  tx.feePayer = from
  let ix
  if (!a.token.mint) {
    ix = SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: a.amount })
  } else {
    const mint = new PublicKey(a.token.mint)
    const program = await getMintProgram(conn, a.token.mint)
    const src = getAssociatedTokenAddressSync(mint, from, true, program)
    const dst = getAssociatedTokenAddressSync(mint, to, true, program)
    tx.add(createAssociatedTokenAccountIdempotentInstruction(from, dst, to, mint, program))
    ix = createTransferCheckedInstruction(src, mint, dst, from, a.amount, a.token.decimals, [], program)
  }
  if (a.reference) ix.keys.push({ pubkey: new PublicKey(a.reference), isSigner: false, isWritable: false })
  tx.add(ix)
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight
  return tx
}

/** Polls signature status until confirmed. Avoids websockets, which many RPCs block in browsers. */
export async function confirmSignature(conn: Connection, signature: string, timeoutMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { value } = await conn.getSignatureStatuses([signature])
    const s = value[0]
    if (s?.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(s.err)}`)
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error('The network has not confirmed this transaction yet. Check it on the explorer before retrying.')
}

export async function sendWithKeypair(conn: Connection, tx: Transaction, kp: Keypair) {
  tx.sign(kp)
  const sig = await conn.sendRawTransaction(tx.serialize(), { maxRetries: 3 })
  await confirmSignature(conn, sig)
  return sig
}

export function newReference() {
  return Keypair.generate().publicKey.toBase58()
}

/** Checks the rent rules a transfer has to satisfy before it is signed. */
export async function checkSolTransfer(conn: Connection, from: string, to: string, amount: bigint, balance: bigint) {
  const left = balance - amount - BASE_FEE
  if (left < 0n) throw new Error('Not enough SOL to cover the amount and the network fee.')
  if (left > 0n && left < RENT_EXEMPT_MIN) {
    throw new Error('This would leave dust that Solana does not allow. Send the maximum or leave at least 0.00089 SOL.')
  }
  if (from !== to) {
    const dest = await conn.getBalance(new PublicKey(to))
    if (dest === 0 && amount < RENT_EXEMPT_MIN) {
      throw new Error('The first payment to an empty address must be at least 0.00089 SOL.')
    }
  }
}
