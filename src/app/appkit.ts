import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana } from '@reown/appkit/networks'
import { REOWN_PROJECT_ID } from './config'

let created = false

export const APPKIT_NETWORK = solana

/** Creates the Reown AppKit modal once per page load. No-op without a project id. */
export function initAppKit() {
  if (created || !REOWN_PROJECT_ID) return
  created = true
  const origin = window.location.origin
  createAppKit({
    adapters: [new SolanaAdapter()],
    networks: [solana],
    defaultNetwork: solana,
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: 'Sotto',
      description: 'Private payments on Solana. Zcash built in.',
      url: origin,
      icons: [`${origin}/brand/logo-500.png`],
    },
    themeMode: 'light',
    themeVariables: {
      '--w3m-accent': '#14121c',
      '--w3m-color-mix': '#dcd3ff',
      '--w3m-color-mix-strength': 12,
      '--w3m-font-family': "'DM Sans', system-ui, sans-serif",
      '--w3m-border-radius-master': '2px',
      '--w3m-z-index': 200,
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
      swaps: false,
      onramp: false,
    },
  })
}
