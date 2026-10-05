import { useState } from 'react'
import { Link } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { RequireWallet, UnlockCard } from '../components/gates'
import { Address, Empty, Notice, PageHeader, Panel, Spinner } from '../components/ui'
import { errorText, fromBase, timeAgo, usd } from '../lib/format'
import { usePrices } from '../lib/prices'
import { useManyHoldings } from '../lib/queries'
import { holdingOf } from '../lib/solana'
import { valueRows } from '../lib/value'
import { useSolana } from '../state/solana'
import { useVault, type FreshAddress } from '../state/vault'

function LabelEditor({ a }: { a: FreshAddress }) {
  const { rename } = useVault()
  const [value, setValue] = useState(a.label ?? '')
  return (
    <input
      className="input input--quiet"
      value={value}
      placeholder="Add a label"
      maxLength={60}
      aria-label={`Label for fresh address ${a.index}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== (a.label ?? '') && rename(a.index, value)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

function AddressTable() {
  const { tokens } = useSolana()
  const vault = useVault()
  const prices = usePrices()
  const all = useManyHoldings(vault.addresses.map((a) => a.address))
  const [busy, setBusy] = useState<'new' | 'recover' | null>(null)
  const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)

  const newAddress = async () => {
    setMsg(null)
    if (!vault.unlocked && !(await vault.unlock())) return
    setBusy('new')
    try {
      const a = vault.create()
      setMsg({ tone: 'good', text: `Fresh address #${a.index} created.` })
    } catch (e) {
      setMsg({ tone: 'bad', text: errorText(e) })
    } finally {
      setBusy(null)
    }
  }

  const recover = async () => {
    setMsg(null)
    if (!vault.unlocked && !(await vault.unlock())) return
    setBusy('recover')
    try {
      const n = await vault.recover()
      setMsg({ tone: 'good', text: n ? `Recovered ${n} address${n === 1 ? '' : 'es'} with on-chain history.` : 'No other used addresses found.' })
    } catch (e) {
      setMsg({ tone: 'bad', text: errorText(e) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn btn--dark btn--sm" onClick={newAddress} disabled={busy !== null || vault.busy}>
          {busy === 'new' ? <Spinner /> : <AppIcon name="plus" />}
          New fresh address
        </button>
        <button type="button" className="btn btn--line btn--sm" onClick={recover} disabled={busy !== null || vault.busy}>
          {busy === 'recover' ? <Spinner label="Scanning" /> : <AppIcon name="refresh" />}
          {busy === 'recover' ? 'Scanning the chain' : 'Recover addresses'}
        </button>
      </div>
      {msg ? <Notice tone={msg.tone} icon={msg.tone === 'good' ? 'check' : 'close'}>{msg.text}</Notice> : null}
      {vault.error ? <Notice tone="bad" icon="close">{vault.error}</Notice> : null}

      {vault.addresses.length ? (
        <div className="table-wrap">
          <table className="table table--stack">
            <thead>
              <tr>
                <th>#</th>
                <th>Label</th>
                <th>Address</th>
                {tokens.map((t) => (
                  <th key={t.symbol} className="num">
                    {t.symbol}
                  </th>
                ))}
                <th className="num">Value</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {vault.addresses.map((a) => {
                const h = all.data?.[a.address]
                const { total } = valueRows(h, tokens, prices.data)
                return (
                  <tr key={a.index}>
                    <td className="mono table__index">#{a.index}</td>
                    <td className="table__label">
                      <LabelEditor a={a} />
                      <span className="table__sub">{timeAgo(a.createdAt / 1000)}</span>
                    </td>
                    <td className="table__addr">
                      <Address value={a.address} />
                    </td>
                    {tokens.map((t) => (
                      <td key={t.symbol} className="num mono" data-label={t.symbol}>
                        {h ? fromBase(holdingOf(h, t), t.decimals, 4) : '…'}
                      </td>
                    ))}
                    <td className="num" data-label="Value">{h ? usd(total) : '…'}</td>
                    <td className="table__actions">
                      <Link className="link-btn" to={`/app/send?from=${a.index}`}>
                        Send
                      </Link>
                      <Link className="link-btn" to={`/app/shield?from=${a.index}`}>
                        Shield
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="key" title="No fresh addresses yet">
          Create one here, or create a pay link: each link gets its own fresh address automatically.
        </Empty>
      )}
    </>
  )
}

export function Addresses() {
  const { unlocked } = useVault()
  return (
    <div className="page">
      <PageHeader title="Fresh addresses" text="New Solana addresses derived from your wallet. Payments to them never show your main wallet." />
      <RequireWallet>
        <div className="cols cols--wide">
          <Panel>
            <AddressTable />
          </Panel>
          <div className="stack">
            {unlocked ? null : <UnlockCard why="Balances show while locked. Unlock to create, recover or send from fresh addresses." />}
            <Panel title="Recover on any device" tone="violet">
              <ul className="explain">
                <li>Every fresh address comes from your wallet's signature of a fixed message, so nothing needs backing up.</li>
                <li>On a new device, connect the same wallet, unlock and press Recover. Sotto re-derives the addresses and finds the ones with history.</li>
                <li>Keys exist only in memory while the vault is unlocked. Locking or closing the tab forgets them.</li>
              </ul>
            </Panel>
          </div>
        </div>
      </RequireWallet>
    </div>
  )
}
