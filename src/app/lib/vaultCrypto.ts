import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const enc = new TextEncoder()
/** secp256k1 group order: a private key must be in [1, N-1]. */
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

// Fixed wording on purpose: standard Ethereum wallets sign deterministically (RFC 6979), so signing
// the same message again recreates the same keys on any device. Changing this text changes every address.
export function vaultMessage(owner: string) {
  return [
    'Zephyra OS vault',
    '',
    'Sign to unlock your Zephyra OS vault on this device.',
    'Your fresh addresses are derived from this signature.',
    '',
    'The signature stays in your browser and is never sent anywhere.',
    'Only sign this message on zephyra.world.',
    '',
    `Wallet: ${owner}`,
    'Version: 1',
  ].join('\n')
}

export function deriveMaster(signature: Uint8Array, owner: string) {
  return hkdf(sha256, signature, enc.encode('zephyra-vault-v1'), enc.encode(owner.toLowerCase()), 32)
}

export function deriveAccount(master: Uint8Array, index: number) {
  for (let attempt = 0; ; attempt++) {
    const seed = hkdf(sha256, master, enc.encode('zephyra-fresh-v1'), enc.encode(`fresh:${index}:${attempt}`), 32)
    const k = BigInt(bytesToHex(seed))
    if (k > 0n && k < N) return privateKeyToAccount(bytesToHex(seed))
  }
}

/** Short public fingerprint of the vault signature, used to detect a wallet that signs differently. */
export function fingerprint(signature: Uint8Array) {
  const h = sha256(new Uint8Array([...enc.encode('zephyra-fp-v1'), ...signature]))
  return Array.from(h.slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('')
}
