import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'
import type { Address, Hex } from 'viem'
import { QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useAccount, useSendTransaction, useSignMessage, useSwitchChain } from 'wagmi'
import { useAppKit, useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react'
import { queryClient, wagmiAdapter } from '../appkit'
import { CHAIN_ID, type NetworkId } from '../config'
import type { TxRequest } from '../lib/chain'

/** The only thing the rest of the dashboard knows about the wallet. */
export type WalletApi = {
  configured: boolean
  address: Address | null
  walletName?: string
  network: NetworkId
  connect: () => void
  manage: () => void
  disconnect: () => Promise<void>
  signMessage: (message: string) => Promise<Hex>
  sendTransaction: (req: TxRequest) => Promise<Hex>
}

const WalletContext = createContext<WalletApi | null>(null)

export function useWallet() {
  const v = use(WalletContext)
  if (!v) throw new Error('useWallet must be used inside WalletProvider')
  return v
}

function AppKitWallet({ children }: { children: ReactNode }) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount({ namespace: 'eip155' })
  const { disconnect } = useDisconnect()
  const { walletInfo } = useWalletInfo()
  const { chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { signMessageAsync } = useSignMessage()
  const { sendTransactionAsync } = useSendTransaction()
  const connected = isConnected && address ? (address as Address) : null

  const signMessage = useCallback((message: string) => signMessageAsync({ message }), [signMessageAsync])

  const sendTransaction = useCallback(
    async (req: TxRequest) => {
      if (chainId !== CHAIN_ID) await switchChainAsync({ chainId: CHAIN_ID })
      return sendTransactionAsync({ to: req.to, value: req.value, data: req.data, chainId: CHAIN_ID })
    },
    [chainId, switchChainAsync, sendTransactionAsync],
  )

  const api = useMemo<WalletApi>(
    () => ({
      configured: true,
      address: connected,
      walletName: walletInfo?.name,
      network: 'mainnet',
      connect: () => void open({ view: 'Connect', namespace: 'eip155' }),
      manage: () => void open({ view: 'Account' }),
      disconnect: () => disconnect({ namespace: 'eip155' }),
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
  if (!wagmiAdapter) return <UnconfiguredWallet>{children}</UnconfiguredWallet>
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppKitWallet>{children}</AppKitWallet>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
