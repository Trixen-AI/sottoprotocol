import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { Keypair } from '@solana/web3.js'

const enc = new TextEncoder()

// Fixed wording on purpose: ed25519 wallet signatures are deterministic, so signing the same
// message again recreates the same keys on any device. Changing this text changes every address.
export function vaultMessage(owner: string) {
  return enc.encode(
    [
      'Sotto vault',
      '',
      'Sign to unlock your Sotto vault on this device.',
      'Your fresh addresses are derived from this signature.',
      '',
      'The signature stays in your browser and is never sent anywhere.',
      'Only sign this message on sottoprotocol.cash.',
      '',
      `Wallet: ${owner}`,
      'Version: 1',
    ].join('\n'),
  )
}

export function deriveMaster(signature: Uint8Array, owner: string) {
  return hkdf(sha256, signature, enc.encode('sotto-vault-v1'), enc.encode(owner), 32)
}

export function deriveKeypair(master: Uint8Array, index: number) {
  const seed = hkdf(sha256, master, enc.encode('sotto-fresh-v1'), enc.encode(`fresh:${index}`), 32)
  return Keypair.fromSeed(seed)
}

/** Short public fingerprint of the vault signature, used to detect a wallet that signs differently. */
export function fingerprint(signature: Uint8Array) {
  const h = sha256(new Uint8Array([...enc.encode('sotto-fp-v1'), ...signature]))
  return Array.from(h.slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('')
}
