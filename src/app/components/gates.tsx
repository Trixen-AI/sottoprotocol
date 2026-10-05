import type { ReactNode } from 'react'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'
import { AppIcon } from './AppIcon'
import { Notice, Spinner } from './ui'

export function SetupNotice() {
  return (
    <Notice tone="warn" icon="wallet">
      Wallet connection is not configured. Add <code>VITE_REOWN_PROJECT_ID</code> to <code>.env</code> (see{' '}
      <code>.env.example</code>) and restart the dev server. Reading public data still works.
    </Notice>
  )
}

export function ConnectCard({ title = 'Connect your wallet', children }: { title?: string; children?: ReactNode }) {
  const { configured, connect } = useWallet()
  return (
    <div className="gate">
      <span className="gate__icon">
        <AppIcon name="wallet" />
      </span>
      <h2 className="gate__title">{title}</h2>
      <p className="gate__text">
        {children ?? 'Sign in with the Solana wallet you already have. Sotto never holds your keys and cannot move your funds.'}
      </p>
      {configured ? (
        <button type="button" className="btn btn--dark" onClick={connect}>
          Connect wallet
        </button>
      ) : (
        <p className="muted">Connecting turns on once a Reown project ID is set (see the notice above).</p>
      )}
    </div>
  )
}

export function RequireWallet({ children, why }: { children: ReactNode; why?: string }) {
  const { address } = useWallet()
  return address ? <>{children}</> : <ConnectCard>{why}</ConnectCard>
}

export function UnlockCard({ why }: { why?: string }) {
  const { unlock, busy, error } = useVault()
  return (
    <div className="gate">
      <span className="gate__icon">
        <AppIcon name="lock" />
      </span>
      <h2 className="gate__title">Unlock your vault</h2>
      <p className="gate__text">
        {why ??
          'Your fresh addresses are derived on this device from a signature of your wallet. Sign once to unlock them for this session.'}
      </p>
      <ul className="gate__list">
        <li>Signing a message costs nothing and moves no funds.</li>
        <li>The signature never leaves your browser, and no key is stored.</li>
        <li>The first time, you sign twice so Sotto can confirm your addresses are recoverable on any device.</li>
      </ul>
      <button type="button" className="btn btn--dark" onClick={() => void unlock()} disabled={busy}>
        {busy ? <Spinner label="Waiting for your wallet" /> : <AppIcon name="unlock" />}
        {busy ? 'Check your wallet' : 'Unlock vault'}
      </button>
      {error ? (
        <Notice tone="bad" icon="close">
          {error}
        </Notice>
      ) : null}
    </div>
  )
}

export function RequireVault({ children, why }: { children: ReactNode; why?: string }) {
  const { address } = useWallet()
  const { unlocked } = useVault()
  if (!address) return <ConnectCard />
  return unlocked ? <>{children}</> : <UnlockCard why={why} />
}

