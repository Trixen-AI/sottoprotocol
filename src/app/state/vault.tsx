import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Keypair } from '@solana/web3.js'
import { getSignatures } from '../lib/solana'
import { useStored, readStored, writeStored } from '../lib/storage'
import { deriveKeypair, deriveMaster, fingerprint, vaultMessage } from '../lib/vaultCrypto'
import { keys } from './keys'
import { useSolana } from './solana'
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
  keypair: (index: number) => Keypair
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

function sameBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { address: owner, signMessage } = useWallet()
  const { connection } = useSolana()
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
        if (!sameBytes(sig, again)) {
          throw new Error(
            'This wallet produces a different signature each time, so fresh addresses could not be recovered later. Use a wallet with standard Solana message signing.',
          )
        }
        writeStored(fpKey, fingerprint(sig))
      } else if (known !== fingerprint(sig)) {
        throw new Error('This signature does not match the one this vault was created with. Unlock with the same wallet.')
      }
      setSecret({ owner, master: deriveMaster(sig, owner) })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy(false)
    }
  }, [owner, signMessage])

  const lock = useCallback(() => setSecret(null), [])

  const keypair = useCallback(
    (index: number) => {
      if (!master) throw new Error('Unlock your vault first.')
      return deriveKeypair(master, index)
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
        address: deriveKeypair(master, index).publicKey.toBase58(),
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

  const recover = useCallback(async () => {
    if (!master || !owner) throw new Error('Unlock your vault first.')
    const found: FreshAddress[] = []
    let gap = 0
    for (let index = 0; gap < GAP_LIMIT; index++) {
      const address = deriveKeypair(master, index).publicKey.toBase58()
      const sigs = await getSignatures(connection, address, 1)
      if (sigs.length) {
        gap = 0
        found.push({ index, address, createdAt: (sigs[0].blockTime ?? Date.now() / 1000) * 1000 })
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
  }, [master, owner, connection, setStore])

  const labelOf = useCallback((address: string) => store.items.find((a) => a.address === address)?.label, [store.items])

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
      keypair,
      rename,
      recover,
      labelOf,
    }),
    [owner, master, busy, error, store.items, unlock, lock, create, keypair, rename, recover, labelOf],
  )
  return <VaultContext value={api}>{children}</VaultContext>
}
