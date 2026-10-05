import { useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { Address, Notice, PageHeader, Panel } from '../components/ui'
import { removeStored } from '../lib/storage'
import { keys } from '../state/keys'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

export function Settings() {
  const wallet = useWallet()
  const vault = useVault()
  const [cleared, setCleared] = useState(false)

  const forget = () => {
    if (!wallet.address) return
    const ok = window.confirm(
      'Forget pay links, labels and transfer history for this wallet on this device? Funds are not affected, and fresh addresses can be recovered later from your wallet.',
    )
    if (!ok) return
    vault.lock()
    removeStored(keys.ownerPrefix(wallet.address))
    setCleared(true)
  }

  return (
    <div className="page">
      <PageHeader title="Settings" text="Your wallet, your vault and the data kept on this device." />
      <div className="narrow stack">
        <Panel title="Wallet">
          {wallet.address ? (
            <>
              <dl className="kv">
                <div>
                  <dt>Connected</dt>
                  <dd>
                    <Address value={wallet.address} chars={6} />
                  </dd>
                </div>
                {wallet.walletName ? (
                  <div>
                    <dt>Wallet</dt>
                    <dd>{wallet.walletName}</dd>
                  </div>
                ) : null}
              </dl>
              <button type="button" className="btn btn--line btn--sm" onClick={() => void wallet.disconnect()}>
                Disconnect
              </button>
            </>
          ) : (
            <p className="muted">No wallet connected.</p>
          )}
        </Panel>
        <Panel title="Vault">
          <p className="muted">
            {vault.unlocked
              ? 'Unlocked for this session. Keys for your fresh addresses are held in memory only.'
              : 'Locked. Fresh address keys are not in memory.'}
          </p>
          <div className="btn-row">
            {vault.unlocked ? (
              <button type="button" className="btn btn--dark btn--sm" onClick={vault.lock}>
                <AppIcon name="lock" />
                Lock now
              </button>
            ) : wallet.address ? (
              <button type="button" className="btn btn--dark btn--sm" onClick={() => void vault.unlock()} disabled={vault.busy}>
                <AppIcon name="unlock" />
                Unlock
              </button>
            ) : null}
          </div>
          {vault.error ? <Notice tone="bad" icon="close">{vault.error}</Notice> : null}
        </Panel>
        <Panel title="Data on this device">
          <p className="muted">
            Pay links, labels, your Zcash address and transfer history are stored in this browser for the connected wallet. Nothing is sent to a server.
          </p>
          <button type="button" className="btn btn--line btn--sm" onClick={forget} disabled={!wallet.address}>
            Forget this wallet's data
          </button>
          {cleared ? <Notice tone="good" icon="check">Cleared. Use Recover on Fresh addresses to find funded addresses again.</Notice> : null}
        </Panel>
      </div>
    </div>
  )
}
