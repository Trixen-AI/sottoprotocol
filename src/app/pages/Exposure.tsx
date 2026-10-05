import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { Address, Empty, Notice, PageHeader, Panel, Skeleton } from '../components/ui'
import { ActivityList } from '../components/walletBits'
import { dateTime, errorText, fromBase, short, timeAgo, usd } from '../lib/format'
import { usePrices } from '../lib/prices'
import { useExposure } from '../lib/queries'
import { isAddress } from '../lib/solana'
import { tokenByMint } from '../lib/tokens'
import { valueRows } from '../lib/value'
import { useSolana } from '../state/solana'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

function Report({ address }: { address: string }) {
  const { tokens, network } = useSolana()
  const prices = usePrices()
  const { labelOf } = useVault()
  const report = useExposure(address)
  if (report.error) return <Notice tone="bad" icon="close">{errorText(report.error)}</Notice>
  const r = report.data
  if (!r) return <Skeleton lines={6} />
  const value = valueRows(r.holdings, tokens, prices.data)
  const okTx = r.history.length - r.failed

  return (
    <>
      <div className="stat-grid">
        <section className="card card--ink stat">
          <div className="stat__head">
            <p className="stat__label">Balance anyone can read</p>
            <AppIcon name="eye" />
          </div>
          <p className="stat__value">{usd(value.total)}</p>
          <ul className="stat__rows">
            {value.rows.map((row) => (
              <li key={row.token.symbol}>
                <span>{row.token.symbol}</span>
                <span className="mono">{fromBase(row.raw, row.token.decimals, 4)}</span>
              </li>
            ))}
            {value.otherCount ? (
              <li>
                <span>Other tokens</span>
                <span>{value.otherCount}</span>
              </li>
            ) : null}
          </ul>
          {r.knownTokensOnly ? <p className="stat__foot">Showing SOL, USDC and ZEC. Other tokens are not listed by the current network endpoint.</p> : null}
        </section>
        <section className="card card--violet stat">
          <div className="stat__head">
            <p className="stat__label">Activity on record</p>
            <AppIcon name="overview" />
          </div>
          <p className="stat__value">{okTx} transactions</p>
          <p className="stat__foot">
            {r.firstSeen && r.lastSeen ? `Between ${dateTime(r.firstSeen)} and ${dateTime(r.lastSeen)}.` : 'No dated activity in this scan.'} Latest{' '}
            {r.history.length} checked.
          </p>
        </section>
        <section className="card card--gold stat">
          <div className="stat__head">
            <p className="stat__label">People it paid or was paid by</p>
            <AppIcon name="link" />
          </div>
          <p className="stat__value">{r.counterparties.length} addresses</p>
          <p className="stat__foot">Each one can be followed to its own history in the same way.</p>
        </section>
      </div>

      <div className="cols">
        <Panel title="Who it deals with">
          {r.counterparties.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th className="num">Times</th>
                    <th className="num">Paid it</th>
                    <th className="num">It paid</th>
                    <th>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {r.counterparties.slice(0, 12).map((c) => (
                    <tr key={c.address}>
                      <td>
                        <Address value={c.address} label={labelOf(c.address)} />
                      </td>
                      <td className="num">{c.count}</td>
                      <td className="num">{c.received}</td>
                      <td className="num">{c.sent}</td>
                      <td>{timeAgo(c.lastTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No transfers with other addresses in this scan.</p>
          )}
        </Panel>
        <div className="stack">
          <Panel title="Money in and out">
            {r.flows.length ? (
              <ul className="stat__rows stat__rows--plain">
                {r.flows.map((f) => {
                  const sym = f.asset === 'SOL' ? 'SOL' : (tokenByMint(network, f.asset)?.symbol ?? short(f.asset, 3))
                  return (
                    <li key={f.asset}>
                      <span>{sym}</span>
                      <span className="mono">
                        {f.in > 0n ? `+${fromBase(f.in, f.decimals, 6)}` : '0'} in · {f.out > 0n ? `−${fromBase(f.out, f.decimals, 6)}` : '0'} out
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted">No value moved in this scan.</p>
            )}
          </Panel>
          <Panel title="With Sotto" tone="violet">
            <ul className="explain">
              <li>Payments to your pay links land at fresh addresses that never touched this wallet, so they don't appear here.</li>
              <li>Paying from a fresh address leaves this wallet out of the transaction.</li>
              <li>Value moved through the Shield ends up in Zcash's shielded pool.</li>
            </ul>
            <Link className="btn btn--dark btn--sm" to="/app/receive">
              Create a pay link
            </Link>
          </Panel>
        </div>
      </div>

      <Panel title="Recent transactions">
        <ActivityList items={r.history} address={address} />
      </Panel>
    </>
  )
}

export function Exposure() {
  const { address: own } = useWallet()
  const [params, setParams] = useSearchParams()
  const target = params.get('address') ?? own ?? ''
  const [input, setInput] = useState(target)
  const valid = isAddress(input)

  return (
    <div className="page">
      <PageHeader title="Exposure" text="What anyone with a block explorer can learn about a wallet. Public data only." />
      <Panel>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) setParams({ address: input.trim() })
          }}
        >
          <input className="input mono" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Solana address" aria-label="Solana address to scan" />
          <button type="submit" className="btn btn--dark" disabled={!valid}>
            Scan
          </button>
          {own && input !== own ? (
            <button type="button" className="btn btn--line" onClick={() => (setInput(own), setParams({ address: own }))}>
              My wallet
            </button>
          ) : null}
        </form>
      </Panel>
      {isAddress(target) ? (
        <Report key={target} address={target} />
      ) : (
        <Empty icon="eye" title="Paste an address to scan">
          Try your own wallet first: connect it, or paste its address.
        </Empty>
      )}
    </div>
  )
}
