import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'
import { hexToBytes, type Address } from 'viem'
import type { PrivateKeyAccount } from 'viem/accounts'
import { getHoldings } from '../lib/chain'
import { useStored, readStored, writeStored } from '../lib/storage'
import { deriveAccount, deriveMaster, fingerprint, vaultMessage } from '../lib/vaultCrypto'
import { keys } from './keys'
import { useChain } from './chain'
import { useWallet } from './wallet'

export type FreshAddress = { index: number; address: string; label?: string; createdAt: number }
type FreshStore = { next: number; items: FreshAddress[] }
const EMPTY: FreshStore = { next: 0, items: [] }
const GAP_LIMIT = 10

type VaultApi = {
  owner: string | null
  unlocked: boolean
  busy: boolean
  error: string | null
  addresses: FreshAddress[]
  unlock: () => Promise<boolean>
  lock: () => void
  create: (label?: string) => FreshAddress
  account: (index: number) => PrivateKeyAccount
  rename: (index: number, label: string) => void
  recover: () => Promise<number>
  labelOf: (address: string) => string | undefined
}

const VaultContext = createContext<VaultApi | null>(null)

export function useVault() {
  const v = use(VaultContext)
  if (!v) throw new Error('useVault must be used inside VaultProvider')
  return v
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { address: owner, signMessage } = useWallet()
  const { client, tokens } = useChain()
  const [store, setStore] = useStored(owner ? keys.fresh(owner) : null, EMPTY)
  // master key lives in memory only, tagged with the wallet it belongs to
  const [secret, setSecret] = useState<{ owner: string; master: Uint8Array } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const master = secret && secret.owner === owner ? secret.master : null

  const unlock = useCallback(async () => {
    if (!owner) return false
    setBusy(true)
    setError(null)
    try {
      const msg = vaultMessage(owner)
      const sig = await signMessage(msg)
      const fpKey = keys.fingerprint(owner)
      const known = readStored<string | null>(fpKey, null)
      if (!known) {
        // First unlock: a second signature proves the wallet signs deterministically,
        // which is what makes these addresses recoverable on any device.
        const again = await signMessage(msg)
        if (sig.toLowerCase() !== again.toLowerCase()) {
          throw new Error(
            'This wallet produces a different signature each time (common with smart-contract wallets), so fresh addresses could not be recovered later. Use a standard Ethereum wallet such as MetaMask or Rabby.',
          )
        }
        writeStored(fpKey, fingerprint(hexToBytes(sig)))
      } else if (known !== fingerprint(hexToBytes(sig))) {
        throw new Error('This signature does not match the one this vault was created with. Unlock with the same wallet.')
      }
      setSecret({ owner, master: deriveMaster(hexToBytes(sig), owner) })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy(false)
    }
  }, [owner, signMessage])

  const lock = useCallback(() => setSecret(null), [])

  const account = useCallback(
    (index: number) => {
      if (!master) throw new Error('Unlock your vault first.')
      return deriveAccount(master, index)
    },
    [master],
  )

  const create = useCallback(
    (label?: string) => {
      if (!master || !owner) throw new Error('Unlock your vault first.')
      const current = readStored(keys.fresh(owner), EMPTY)
      const index = current.next
      const record: FreshAddress = {
        index,
        address: deriveAccount(master, index).address,
        label: label?.trim() || undefined,
        createdAt: Date.now(),
      }
      setStore({ next: index + 1, items: [...current.items, record] })
      return record
    },
    [master, owner, setStore],
  )

  const rename = useCallback(
    (index: number, label: string) =>
      setStore((s) => ({ ...s, items: s.items.map((a) => (a.index === index ? { ...a, label: label.trim() || undefined } : a)) })),
    [setStore],
  )

  // An address counts as used if it ever sent a transaction or holds anything.
  const recover = useCallback(async () => {
    if (!master || !owner) throw new Error('Unlock your vault first.')
    const found: FreshAddress[] = []
    let gap = 0
    for (let index = 0; gap < GAP_LIMIT; index++) {
      const address = deriveAccount(master, index).address
      const [nonce, holdings] = await Promise.all([
        client.getTransactionCount({ address: address as Address }),
        getHoldings(client, address, tokens),
      ])
      if (nonce > 0 || holdings.some((h) => h.raw > 0n)) {
        gap = 0
        found.push({ index, address, createdAt: Date.now() })
      } else {
        gap++
      }
    }
    let added = 0
    setStore((s) => {
      const have = new Set(s.items.map((a) => a.index))
      const fresh = found.filter((f) => !have.has(f.index))
      added = fresh.length
      const items = [...s.items, ...fresh].sort((a, b) => a.index - b.index)
      const next = Math.max(s.next, ...items.map((a) => a.index + 1), 0)
      return { next, items }
    })
    return added
  }, [master, owner, client, tokens, setStore])

  const labelOf = useCallback(
    (address: string) => store.items.find((a) => a.address.toLowerCase() === address.toLowerCase())?.label,
    [store.items],
  )

  const api = useMemo<VaultApi>(
    () => ({
      owner,
      unlocked: Boolean(master),
      busy,
      error,
      addresses: store.items,
      unlock,
      lock,
      create,
      account,
      rename,
      recover,
      labelOf,
    }),
    [owner, master, busy, error, store.items, unlock, lock, create, account, rename, recover, labelOf],
  )
  return <VaultContext value={api}>{children}</VaultContext>
}
