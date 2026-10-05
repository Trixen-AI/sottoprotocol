import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { ConnectCard } from '../components/gates'
import { Amount, PageHeader, Panel, Pill, Skeleton } from '../components/ui'
import { ActivityList } from '../components/walletBits'
import { fromBase, timeAgo, usd } from '../lib/format'
import { statusLabel, FINAL_STATUSES } from '../lib/oneclick'
import { usePrices } from '../lib/prices'
import { useHistory, useHoldings, useManyHoldings } from '../lib/queries'
import { isAddress } from '../lib/solana'
import { tokenBySymbol } from '../lib/tokens'
import { sumHoldings, valueRows } from '../lib/value'
import { linkStatus, receivedTotal, usePayLinks } from '../state/payLinks'
import { useSolana } from '../state/solana'
import { useSwaps } from '../state/swaps'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

function ScanAnyAddress() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const valid = isAddress(value)
  return (
    <Panel title="See what any wallet reveals">
      <p className="muted">Paste a Solana address to see what anyone with an explorer can read about it. No wallet needed.</p>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) navigate(`/app/exposure?address=${value.trim()}`)
        }}
      >
        <input className="input mono" placeholder="Solana address" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Solana address" />
        <button type="submit" className="btn btn--dark" disabled={!valid}>
          Scan
        </button>
      </form>
    </Panel>
  )
}

function Connected({ address }: { address: string }) {
  const { tokens, network } = useSolana()
  const { addresses, unlocked } = useVault()
  const prices = usePrices()
  const main = useHoldings(address)
  const fresh = useManyHoldings(addresses.map((a) => a.address))
  const history = useHistory(address, 10)
  const [links] = usePayLinks()
  const [swaps] = useSwaps()

  const pub = valueRows(main.data, tokens, prices.data)
  const sealed = valueRows(sumHoldings(fresh.data), tokens, prices.data)
  const open = links.filter((l) => !l.archived && linkStatus(l) !== 'paid')
  const paid = links.filter((l) => linkStatus(l) === 'paid')
  const activeSwaps = swaps.filter((s) => !FINAL_STATUSES.has(s.status ?? ''))

  return (
    <>
      <div className="stat-grid">
        <section className="card card--ink stat">
          <div className="stat__head">
            <p className="stat__label">Public wallet</p>
            <AppIcon name="eye" />
          </div>
          <p className="stat__value">{main.data ? usd(pub.total) : '…'}</p>
          <ul className="stat__rows">
            {pub.rows.map((r) => (
              <li key={r.token.symbol}>
                <span>{r.token.symbol}</span>
                <span className="mono">{main.data ? fromBase(r.raw, r.token.decimals, 4) : '…'}</span>
              </li>
            ))}
            {pub.otherCount ? (
              <li>
                <span>Other tokens</span>
                <span>{pub.otherCount}</span>
              </li>
            ) : null}
          </ul>
          <p className="stat__foot">Anyone can read this balance in an explorer.</p>
        </section>

        <section className="card card--violet stat">
          <div className="stat__head">
            <p className="stat__label">Fresh addresses</p>
            <AppIcon name="key" />
          </div>
          <p className="stat__value">{addresses.length ? (fresh.data ? usd(sealed.total) : '…') : usd(0)}</p>
          <ul className="stat__rows">
            {sealed.rows.map((r) => (
              <li key={r.token.symbol}>
                <span>{r.token.symbol}</span>
                <span className="mono">{fromBase(r.raw, r.token.decimals, 4)}</span>
              </li>
            ))}
          </ul>
          <p className="stat__foot">
            {addresses.length} address{addresses.length === 1 ? '' : 'es'}, not linked to your wallet on-chain.{' '}
            <Link to="/app/addresses">{unlocked ? 'Manage' : 'Unlock'}</Link>
          </p>
        </section>

        <section className="card card--gold stat">
          <div className="stat__head">
            <p className="stat__label">Pay links</p>
            <AppIcon name="link" />
          </div>
          <p className="stat__value">
            {open.length} open · {paid.length} paid
          </p>
          <ul className="stat__rows">
            {links.slice(0, 3).map((l) => {
              const t = tokenBySymbol(network, l.token)
              return (
                <li key={l.id}>
                  <span>{l.label || l.note || `Link #${l.index}`}</span>
                  <span className="mono">{t ? `${fromBase(receivedTotal(l), t.decimals, 4)} ${t.symbol}` : ''}</span>
                </li>
              )
            })}
          </ul>
          <p className="stat__foot">
            <Link to="/app/receive">Create a pay link</Link>
          </p>
        </section>
      </div>

      <div className="quick">
        <Link className="quick__item" to="/app/receive">
          <AppIcon name="link" />
          Get paid
        </Link>
        <Link className="quick__item" to="/app/send">
          <AppIcon name="send" />
          Send
        </Link>
        <Link className="quick__item" to="/app/shield">
          <AppIcon name="shield" />
          Shield to Zcash
        </Link>
        <Link className="quick__item" to="/app/proofs">
          <AppIcon name="proof" />
          Prove a payment
        </Link>
        <Link className="quick__item" to="/app/exposure">
          <AppIcon name="eye" />
          Check exposure
        </Link>
      </div>

      <div className="cols">
        <Panel
          title="Public wallet activity"
          action={
            <button type="button" className="icon-btn" onClick={history.refresh} aria-label="Refresh activity">
              <AppIcon name="refresh" />
            </button>
          }
        >
          {history.error ? <p className="muted">Could not load activity from the RPC. Check Settings.</p> : null}
          {history.data ? <ActivityList items={history.data} address={address} /> : !history.error ? <Skeleton lines={5} /> : null}
        </Panel>

        <div className="stack">
          <Panel title="Pay links" action={<Link to="/app/receive" className="link-btn">All</Link>}>
            {links.length ? (
              <ul className="list">
                {links.slice(0, 5).map((l) => {
                  const st = linkStatus(l)
                  const t = tokenBySymbol(network, l.token)
                  return (
                    <li key={l.id}>
                      <Link to={`/app/receive/${l.id}`} className="list__row">
                        <span>
                          <span className="list__title">{l.label || l.note || `Pay link #${l.index}`}</span>
                          <span className="list__sub">
                            {l.amount && t ? `${fromBase(BigInt(l.amount), t.decimals)} ${t.symbol}` : `Any amount of ${l.token}`} · {timeAgo(l.createdAt / 1000)}
                          </span>
                        </span>
                        <Pill tone={st === 'paid' ? 'good' : st === 'partial' ? 'warn' : 'neutral'}>{st}</Pill>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted">No pay links yet. Each one lands at a fresh address, so payers never see your wallet.</p>
            )}
          </Panel>
          {swaps.length ? (
            <Panel title="Shield transfers" action={<Link to="/app/shield" className="link-btn">All</Link>}>
              <ul className="list">
                {swaps.slice(0, 3).map((s) => (
                  <li key={s.id} className="list__row">
                    <span>
                      <span className="list__title">
                        {s.amountIn} {s.assetIn} → {s.direction === 'toZcash' ? `${s.amountOut} ZEC` : `${s.amountOut} SOL`}
                      </span>
                      <span className="list__sub">{timeAgo(s.createdAt / 1000)}</span>
                    </span>
                    <Pill tone={s.status === 'SUCCESS' ? 'good' : s.status === 'FAILED' || s.status === 'REFUNDED' ? 'bad' : 'accent'}>
                      {statusLabel(s.status)}
                    </Pill>
                  </li>
                ))}
              </ul>
              {activeSwaps.length ? <p className="muted small-print">Tracking {activeSwaps.length} transfer(s) live.</p> : null}
            </Panel>
          ) : null}
          {prices.data ? (
            <Panel title="Prices">
              <ul className="stat__rows stat__rows--plain">
                {(['SOL', 'USDC', 'ZEC'] as const).map((sym) => {
                  const t = tokenBySymbol('mainnet', sym)!
                  return (
                    <li key={sym}>
                      <span>{sym}</span>
                      <Amount raw={10n ** BigInt(t.decimals)} token={t} prices={prices.data} />
                    </li>
                  )
                })}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  )
}

export function Overview() {
  const { address } = useWallet()
  return (
    <div className="page">
      <PageHeader title="Overview" text="Your public wallet, your fresh addresses and your pay links, in one place." />
      {address ? (
        <Connected address={address} />
      ) : (
        <div className="cols">
          <ConnectCard />
          <ScanAnyAddress />
        </div>
      )}
    </div>
  )
}
