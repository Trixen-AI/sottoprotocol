import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  isAddress as isEvmAddress,
  parseEventLogs,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem'
import type { PrivateKeyAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'
import { getTokenBalances } from './blockscout'
import { assetKey, tokenByContract, type Token } from './tokens'

const clients = new Map<string, PublicClient>()

export function getClient(rpc: string): PublicClient {
  let c = clients.get(rpc)
  if (!c) {
    c = createPublicClient({ chain: mainnet, transport: http(rpc) }) as PublicClient
    clients.set(rpc, c)
  }
  return c
}

export function isAddress(value: string) {
  const s = value.trim()
  return /^0x[0-9a-fA-F]{40}$/.test(s) && isEvmAddress(s, { strict: false })
}

export const sameAddress = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase())

// ---------- balances ----------

export type Holding = { contract: string | null; raw: bigint; decimals: number; symbol?: string }

/** Owners for which only the known tokens could be read (the indexer was unavailable). */
const partialOwners = new Set<string>()

export function isTokenListPartial(owner: string) {
  return partialOwners.has(owner.toLowerCase())
}

/** ETH and known-token balances from the RPC, plus every other ERC-20 from the indexer when it answers. */
export async function getHoldings(client: PublicClient, owner: string, known: Token[]): Promise<Holding[]> {
  const addr = owner as Address
  const erc20 = known.filter((t): t is Token & { contract: Address } => Boolean(t.contract))
  const [wei, balances, others] = await Promise.all([
    client.getBalance({ address: addr }),
    client.multicall({
      allowFailure: true,
      contracts: erc20.map((t) => ({ address: t.contract, abi: erc20Abi, functionName: 'balanceOf' as const, args: [addr] as const })),
    }),
    getTokenBalances(owner).catch(() => null),
  ])
  const out: Holding[] = [{ contract: null, raw: wei, decimals: 18, symbol: 'ETH' }]
  erc20.forEach((t, i) => {
    const r = balances[i]
    const raw = r.status === 'success' ? (r.result as bigint) : 0n
    if (raw > 0n) out.push({ contract: t.contract, raw, decimals: t.decimals, symbol: t.symbol })
  })
  if (others) {
    partialOwners.delete(owner.toLowerCase())
    const knownKeys = new Set(erc20.map((t) => assetKey(t.contract)))
    for (const b of others) if (!knownKeys.has(assetKey(b.contract)) && b.raw > 0n) out.push(b)
  } else {
    partialOwners.add(owner.toLowerCase())
  }
  return out
}

export function holdingOf(holdings: Holding[] | undefined, token: Pick<Token, 'contract'>) {
  return holdings?.find((h) => assetKey(h.contract) === assetKey(token.contract))?.raw ?? 0n
}

// ---------- transaction summaries ----------

export type TokenDelta = { contract: string; delta: bigint; decimals: number; symbol?: string }

export type TxSummary = {
  hash: Hex
  /** unix seconds, null while pending */
  blockTime: number | null
  ok: boolean
  from: string
  /** ETH value moved for the address (gas excluded) */
  eth: bigint
  tokens: TokenDelta[]
  /** addresses on the other side of this address's transfers */
  counterparties: string[]
}

/** Reads one transaction straight from the RPC and works out what it did for `address`. */
export async function summarizeTx(client: PublicClient, hash: Hex, address: string): Promise<TxSummary> {
  const [tx, receipt] = await Promise.all([client.getTransaction({ hash }), client.getTransactionReceipt({ hash })])
  const block = await client.getBlock({ blockNumber: receipt.blockNumber })
  const counter = new Set<string>()
  let eth = 0n
  if (tx.value > 0n) {
    if (sameAddress(tx.to, address)) {
      eth += tx.value
      counter.add(tx.from)
    }
    if (sameAddress(tx.from, address)) {
      eth -= tx.value
      if (tx.to) counter.add(tx.to)
    }
  }
  const byToken = new Map<string, TokenDelta>()
  const logs = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs, strict: false })
  for (const log of logs) {
    const { from, to, value } = log.args as { from?: Address; to?: Address; value?: bigint }
    if (value === undefined || !from || !to) continue
    let delta = 0n
    if (sameAddress(to, address)) {
      delta += value
      counter.add(from)
    }
    if (sameAddress(from, address)) {
      delta -= value
      counter.add(to)
    }
    if (delta === 0n) continue
    const key = log.address.toLowerCase()
    const known = tokenByContract('mainnet', log.address)
    const prev = byToken.get(key)
    byToken.set(key, { contract: key, delta: (prev?.delta ?? 0n) + delta, decimals: known?.decimals ?? 18, symbol: known?.symbol })
  }
  counter.delete(address.toLowerCase())
  return {
    hash,
    blockTime: Number(block.timestamp),
    ok: receipt.status === 'success',
    from: tx.from,
    eth,
    tokens: [...byToken.values()],
    counterparties: [...counter].filter((c) => !sameAddress(c, address)),
  }
}

// ---------- transfers ----------

export type TxRequest = { to: Address; value?: bigint; data?: Hex }

export function buildTransfer(token: Token, to: string, amount: bigint): TxRequest {
  if (!token.contract) return { to: to as Address, value: amount }
  return {
    to: token.contract,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [to as Address, amount] }),
  }
}

/** Upper bound for the gas a transaction will cost, with a margin for fee movement. */
export async function gasCost(client: PublicClient, from: string, req: TxRequest) {
  const [gas, fees] = await Promise.all([
    client.estimateGas({ account: from as Address, to: req.to, value: req.value, data: req.data }),
    client.estimateFeesPerGas(),
  ])
  const perGas = fees.maxFeePerGas ?? fees.gasPrice ?? 0n
  return (gas * perGas * 125n) / 100n
}

/** Most ETH an address can send after paying for a plain transfer. */
export async function maxEthSend(client: PublicClient, balance: bigint) {
  const fees = await client.estimateFeesPerGas()
  const cost = (21_000n * (fees.maxFeePerGas ?? fees.gasPrice ?? 0n) * 125n) / 100n
  return balance > cost ? balance - cost : 0n
}

export async function waitForTx(client: PublicClient, hash: Hex) {
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180_000, pollingInterval: 2_000 })
  if (receipt.status !== 'success') throw new Error('The transaction reverted on-chain.')
  return receipt
}

/** Signs and sends with a fresh-address key held in memory, then waits for confirmation. */
export async function sendFromAccount(rpc: string, client: PublicClient, account: PrivateKeyAccount, req: TxRequest) {
  const wallet = createWalletClient({ account, chain: mainnet, transport: http(rpc) })
  const hash = await wallet.sendTransaction({ to: req.to, value: req.value, data: req.data })
  await waitForTx(client, hash)
  return hash
}
