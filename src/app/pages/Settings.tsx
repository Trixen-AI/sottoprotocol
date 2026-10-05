import { useState } from 'react'
import { Connection } from '@solana/web3.js'
import { AppIcon } from '../components/AppIcon'
import { Address, Field, Notice, PageHeader, Panel, Pill, Spinner } from '../components/ui'
import { DEFAULT_RPC, NETWORK_LABEL, REOWN_PROJECT_ID, type NetworkId } from '../config'
import { errorText } from '../lib/format'
import { removeStored } from '../lib/storage'
import { keys } from '../state/keys'
import { useSolana } from '../state/solana'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

function RpcRow({ net }: { net: NetworkId }) {
  const { rpcUrl, network, setRpc, connectionFor } = useSolana()
  const current = net === network ? rpcUrl : connectionFor(net).rpcEndpoint
  const [value, setValue] = useState(current === DEFAULT_RPC[net] ? '' : current)
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setTest(null)
    const url = value.trim() || DEFAULT_RPC[net]
    const t0 = performance.now()
    try {
      const slot = await new Connection(url, 'confirmed').getSlot()
      setTest({ ok: true, text: `Reachable from this browser. Slot ${slot.toLocaleString('en-US')}, ${Math.round(performance.now() - t0)} ms.` })
    } catch (e) {
      setTest({ ok: false, text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field label={`${NETWORK_LABEL[net]} RPC`} htmlFor={`rpc-${net}`} hint={`Default: ${DEFAULT_RPC[net]}`}>
      <div className="copy-row">
        <input id={`rpc-${net}`} className="input mono" placeholder={DEFAULT_RPC[net]} value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="button" className="btn btn--line btn--sm" onClick={run} disabled={busy}>
          {busy ? <Spinner label="Testing" /> : null}Test
        </button>
        <button type="button" className="btn btn--dark btn--sm" onClick={() => setRpc(net, value || null)}>
          Save
        </button>
      </div>
      {test ? <Notice tone={test.ok ? 'good' : 'bad'} icon={test.ok ? 'check' : 'close'}>{test.text}</Notice> : null}
    </Field>
  )
}

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
      <PageHeader title="Settings" text="RPC endpoint, your vault and the data kept on this device." />
      <div className="cols">
        <div className="stack">
          <Panel title="RPC endpoint">
            <p className="muted">
              Reads and transactions go through this endpoint. Solana's own public mainnet endpoint refuses browser requests, so the
              default is a free public endpoint. For regular use, a dedicated RPC is faster and more reliable.
            </p>
            <RpcRow net="mainnet" />
          </Panel>
        </div>
        <div className="stack">
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
            <p className="muted small-print">
              Wallet connection: Reown AppKit {REOWN_PROJECT_ID ? <Pill tone="good">configured</Pill> : <Pill tone="warn">needs VITE_REOWN_PROJECT_ID</Pill>}
            </p>
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
    </div>
  )
}
