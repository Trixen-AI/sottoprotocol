import type { NetworkId } from '../config'

// localStorage keys. Public data only: addresses, labels, pay link metadata, swap records.
// Private keys are never stored; they are derived in memory when the vault is unlocked.
export const keys = {
  fresh: (owner: string) => `${owner}:fresh`,
  fingerprint: (owner: string) => `${owner}:vault-fp`,
  payLinks: (owner: string, net: NetworkId) => `${owner}:${net}:paylinks`,
  swaps: (owner: string) => `${owner}:swaps`,
  zcashAddress: (owner: string) => `${owner}:zcash-address`,
  proofs: (owner: string) => `${owner}:proofs`,
  ownerPrefix: (owner: string) => `${owner}:`,
}
