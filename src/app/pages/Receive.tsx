import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { RequireWallet } from '../components/gates'
import { Empty, Field, Notice, PageHeader, Panel, Pill, Segmented, Spinner } from '../components/ui'
import { TokenSelect } from '../components/walletBits'
import { fromBase, timeAgo, toBase } from '../lib/format'
import { newReference } from '../lib/solana'
import { tokenBySymbol } from '../lib/tokens'
import { linkStatus, receivedTotal, usePayLinks, type PayLink } from '../state/payLinks'
import { useSolana } from '../state/solana'
import { useVault } from '../state/vault'

function CreateLink() {
  const navigate = useNavigate()
  const { tokens, network } = useSolana()
  const vault = useVault()
  const [, setLinks] = usePayLinks()
  const [symbol, setSymbol] = useState(tokens[1]?.symbol ?? 'SOL')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const token = tokenBySymbol(network, symbol) ?? tokens[0]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const raw = amount.trim() ? toBase(amount, token.decimals) : undefined
      if (raw !== undefined && raw <= 0n) throw new Error('Enter an amount above zero, or leave it empty.')
      if (!vault.unlocked && !(await vault.unlock())) return
      const fresh = vault.create(label || note || undefined)
      const link: PayLink = {
        id: crypto.randomUUID(),
        net: network,
        index: fresh.index,
        address: fresh.address,
        token: token.symbol,
        amount: raw?.toString(),
        ref: newReference(),
        note: note.trim() || undefined,
        label: label.trim() || undefined,
        createdAt: Date.now(),
        payments: [],
        seen: [],
      }
      setLinks((prev) => [link, ...prev])
      navigate(`/app/receive/${link.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Panel title="New pay link">
      <form className="form" onSubmit={submit}>
        <div className="form__row">
          <Field label="Asset" htmlFor="pl-token">
            <TokenSelect id="pl-token" value={symbol} onChange={setSymbol} tokens={tokens} />
          </Field>
          <Field label="Amount" htmlFor="pl-amount" hint="Leave empty to let the payer choose.">
            <input id="pl-amount" className="input mono" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>
        <Field label="Note for the payer" htmlFor="pl-note" hint="Shown on the payment page. It travels inside the link, so keep it non-sensitive.">
          <input id="pl-note" className="input" maxLength={120} placeholder="Invoice 0042" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Private label" htmlFor="pl-label" hint="Only stored on this device.">
          <input id="pl-label" className="input" maxLength={60} placeholder="Design work, May" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}
        <button type="submit" className="btn btn--dark" disabled={vault.busy}>
          {vault.busy ? <Spinner label="Waiting for your wallet" /> : <AppIcon name="plus" />}
          {vault.unlocked ? 'Create pay link' : 'Unlock vault and create'}
        </button>
        <p className="muted small-print">
          Every link gets its own fresh address. The payer sees that address, never your wallet.
        </p>
      </form>
    </Panel>
  )
}

type Filter = 'active' | 'paid' | 'archived'

function LinkList() {
  const { network } = useSolana()
  const [links] = usePayLinks()
  const [filter, setFilter] = useState<Filter>('active')
  const shown = links.filter((l) =>
    filter === 'archived' ? l.archived : !l.archived && (filter === 'paid' ? linkStatus(l) === 'paid' : linkStatus(l) !== 'paid'),
  )
  return (
    <Panel
      title="Your pay links"
      action={
        <Segmented<Filter>
          label="Filter pay links"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Waiting' },
            { value: 'paid', label: 'Paid' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
      }
    >
      {shown.length ? (
        <ul className="list">
          {shown.map((l) => {
            const t = tokenBySymbol(network, l.token)
            const st = linkStatus(l)
            return (
              <li key={l.id}>
                <Link className="list__row" to={`/app/receive/${l.id}`}>
                  <span>
                    <span className="list__title">{l.label || l.note || `Pay link #${l.index}`}</span>
                    <span className="list__sub">
                      {l.amount && t ? `${fromBase(BigInt(l.amount), t.decimals)} ${t.symbol}` : `Any amount of ${l.token}`}
                      {l.payments.length && t ? ` · received ${fromBase(receivedTotal(l), t.decimals, 6)} ${t.symbol}` : ''} · {timeAgo(l.createdAt / 1000)}
                    </span>
                  </span>
                  <Pill tone={st === 'paid' ? 'good' : st === 'partial' ? 'warn' : 'neutral'}>{st === 'open' ? 'waiting' : st}</Pill>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <Empty icon="link" title={filter === 'active' ? 'Nothing waiting' : filter === 'paid' ? 'No paid links yet' : 'Nothing archived'}>
          {filter === 'active' ? 'Create a link and share it. Payments show up here as soon as the network confirms them.' : null}
        </Empty>
      )}
    </Panel>
  )
}

export function Receive() {
  return (
    <div className="page">
      <PageHeader title="Pay links" text="Get paid without showing your wallet. Each link points at a fresh address only your vault controls." />
      <RequireWallet why="Connect the wallet that should control your pay links. Payments land at fresh addresses derived from it.">
        <div className="cols cols--form">
          <CreateLink />
          <LinkList />
        </div>
      </RequireWallet>
    </div>
  )
}
