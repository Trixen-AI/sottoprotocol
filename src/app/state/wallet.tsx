import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'
import type { Connection, Transaction } from '@solana/web3.js'
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect, useWalletInfo } from '@reown/appkit/react'
import type { Provider } from '@reown/appkit-adapter-solana/react'
import { REOWN_PROJECT_ID, type NetworkId } from '../config'

/** The only thing the rest of the dashboard knows about the wallet. */
export type WalletApi = {
  configured: boolean
  address: string | null
  walletName?: string
  network: NetworkId
  connect: () => void
  manage: () => void
  disconnect: () => Promise<void>
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>
}

const WalletContext = createContext<WalletApi | null>(null)

export function useWallet() {
  const v = use(WalletContext)
  if (!v) throw new Error('useWallet must be used inside WalletProvider')
  return v
}

function AppKitWallet({ children }: { children: ReactNode }) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount({ namespace: 'solana' })
  const { walletProvider } = useAppKitProvider<Provider>('solana')
  const { disconnect } = useDisconnect()
  const { walletInfo } = useWalletInfo()
  const connected = isConnected && address ? address : null

  const signMessage = useCallback(
    async (m: Uint8Array) => {
      if (!walletProvider) throw new Error('Connect a wallet first.')
      return walletProvider.signMessage(m)
    },
    [walletProvider],
  )
  const sendTransaction = useCallback(
    async (tx: Transaction, connection: Connection) => {
      if (!walletProvider) throw new Error('Connect a wallet first.')
      return walletProvider.sendTransaction(tx, connection)
    },
    [walletProvider],
  )

  const api = useMemo<WalletApi>(
    () => ({
      configured: true,
      address: connected,
      walletName: walletInfo?.name,
      network: 'mainnet',
      connect: () => void open({ view: 'Connect', namespace: 'solana' }),
      manage: () => void open({ view: 'Account' }),
      disconnect: () => disconnect({ namespace: 'solana' }),
      signMessage,
      sendTransaction,
    }),
    [connected, walletInfo?.name, open, disconnect, signMessage, sendTransaction],
  )
  return <WalletContext value={api}>{children}</WalletContext>
}

const notConfigured = () => Promise.reject(new Error('Wallet connection is not configured. Set VITE_REOWN_PROJECT_ID.'))

function UnconfiguredWallet({ children }: { children: ReactNode }) {
  const api = useMemo<WalletApi>(
    () => ({
      configured: false,
      address: null,
      network: 'mainnet',
      connect: () => {},
      manage: () => {},
      disconnect: async () => {},
      signMessage: notConfigured,
      sendTransaction: notConfigured,
    }),
    [],
  )
  return <WalletContext value={api}>{children}</WalletContext>
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return REOWN_PROJECT_ID ? <AppKitWallet>{children}</AppKitWallet> : <UnconfiguredWallet>{children}</UnconfiguredWallet>
}
