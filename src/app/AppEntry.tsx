import './polyfills'
import '../styles/app.css'
import { Route, Routes } from 'react-router'
import { initAppKit } from './appkit'
import { RouteMeta } from './RouteMeta'
import { DashboardLayout } from './layout/DashboardLayout'
import { Addresses } from './pages/Addresses'
import { Exposure } from './pages/Exposure'
import { NotFound } from './pages/NotFound'
import { Overview } from './pages/Overview'
import { PayLinkDetail } from './pages/PayLinkDetail'
import { PayPage } from './pages/PayPage'
import { ProofPage } from './pages/ProofPage'
import { Proofs } from './pages/Proofs'
import { Receive } from './pages/Receive'
import { Send } from './pages/Send'
import { Settings } from './pages/Settings'
import { Shield } from './pages/Shield'
import { SolanaProvider } from './state/solana'
import { VaultProvider } from './state/vault'
import { WalletProvider } from './state/wallet'

// Runs once when the dashboard chunk loads, never on the marketing page.
initAppKit()

export default function AppEntry() {
  return (
    <WalletProvider>
      <SolanaProvider>
        <VaultProvider>
          <RouteMeta />
          <Routes>
            <Route path="app" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="receive" element={<Receive />} />
              <Route path="receive/:id" element={<PayLinkDetail />} />
              <Route path="send" element={<Send />} />
              <Route path="shield" element={<Shield />} />
              <Route path="addresses" element={<Addresses />} />
              <Route path="proofs" element={<Proofs />} />
              <Route path="exposure" element={<Exposure />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound inDashboard />} />
            </Route>
            <Route path="pay/:code" element={<PayPage />} />
            <Route path="proof/:code" element={<ProofPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </VaultProvider>
      </SolanaProvider>
    </WalletProvider>
  )
}
