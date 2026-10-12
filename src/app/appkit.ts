import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'
import { QueryClient } from '@tanstack/react-query'
import { http } from 'wagmi'
import { DEFAULT_RPC, REOWN_PROJECT_ID } from './config'

export const queryClient = new QueryClient()

/** Ethereum mainnet through the Reown wagmi adapter. Null without a project id. */
export const wagmiAdapter = REOWN_PROJECT_ID
  ? new WagmiAdapter({
      networks: [mainnet],
      projectId: REOWN_PROJECT_ID,
      transports: { [mainnet.id]: http(DEFAULT_RPC.mainnet) },
    })
  : null

let created = false

/** Creates the Reown AppKit modal once per page load. No-op without a project id. */
export function initAppKit() {
  if (created || !wagmiAdapter) return
  created = true
  const origin = window.location.origin
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet],
    defaultNetwork: mainnet,
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: 'Zephyra OS',
      description: 'Private payments on Ethereum. Zcash built in.',
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
