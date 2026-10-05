import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { RequireWallet } from '../components/gates'
import { Address, CopyButton, Empty, ExplorerLink, Notice, PageHeader, Panel, Pill, QRCode, Segmented } from '../components/ui'
import { fromBase, short, timeAgo } from '../lib/format'
import { payLinkUrl, solanaPayUrl, type PayRequest } from '../lib/paylink'
import { useHoldings } from '../lib/queries'
import { holdingOf } from '../lib/solana'
import { tokenBySymbol } from '../lib/tokens'
import { linkStatus, receivedTotal, usePayLinks, type PayLink } from '../state/payLinks'
import { useSolana } from '../state/solana'

function Detail({ link }: { link: PayLink }) {
  const { network } = useSolana()
  const [, setLinks] = usePayLinks()
  const [qr, setQr] = useState<'wallet' | 'link'>('wallet')
  const token = tokenBySymbol(network, link.token)
  const holdings = useHoldings(link.address, 20_000)

  const request: PayRequest = useMemo(
    () => ({ v: 1, net: link.net, to: link.address, token: link.token, amount: link.amount, ref: link.ref, note: link.note }),
    [link],
  )
  if (!token) return <Notice tone="bad">This link uses a token that is not available on this network.</Notice>

  const url = payLinkUrl(window.location.origin, request)
  const spUrl = solanaPayUrl(request, token)
  const st = linkStatus(link)
  const total = receivedTotal(link)
  const pct = link.amount ? Math.min(100, Number((total * 100n) / BigInt(link.amount))) : st === 'paid' ? 100 : 0
  const balance = holdingOf(holdings.data, token)

  const setArchived = (archived: boolean) => setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, archived } : l)))

  return (
    <>
      <PageHeader title={link.label || link.note || `Pay link #${link.index}`} text={`Created ${timeAgo(link.createdAt / 1000)}`}>
        <Pill tone={st === 'paid' ? 'good' : st === 'partial' ? 'warn' : 'neutral'}>{st === 'open' ? 'waiting for payment' : st}</Pill>
        <button type="button" className="btn btn--line btn--sm" onClick={() => setArchived(!link.archived)}>
          {link.archived ? 'Restore' : 'Archive'}
        </button>
      </PageHeader>

      <div className="cols">
        <Panel title="Share">
          <div className="share">
            <div className="share__qr">
              <QRCode value={qr === 'wallet' ? spUrl : url} size={208} />
              <Segmented<'wallet' | 'link'>
                label="QR code type"
                value={qr}
                onChange={setQr}
                options={[
                  { value: 'wallet', label: 'Wallet scan' },
                  { value: 'link', label: 'Web link' },
                ]}
              />
              <p className="muted small-print">
                {qr === 'wallet' ? 'Scan with a mobile Solana wallet (Solana Pay).' : 'Opens the Sotto payment page.'}
              </p>
            </div>
            <div className="share__meta">
              <dl className="kv">
                <div>
                  <dt>Amount</dt>
                  <dd>{link.amount ? `${fromBase(BigInt(link.amount), token.decimals)} ${token.symbol}` : `Payer chooses (${token.symbol})`}</dd>
                </div>
                <div>
                  <dt>Pays into</dt>
                  <dd>
                    <Address value={link.address} label={`Fresh #${link.index}`} />
                  </dd>
                </div>
                {link.note ? (
                  <div>
                    <dt>Payer sees</dt>
                    <dd>{link.note}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="copy-row">
                <input className="input mono" readOnly value={url} aria-label="Pay link" onFocus={(e) => e.currentTarget.select()} />
                <CopyButton value={url} label="Copy link" />
              </div>
              <div className="btn-row">
                <a className="btn btn--line btn--sm" href={url} target="_blank" rel="noopener noreferrer">
                  <AppIcon name="external" />
                  Open payment page
                </a>
                <CopyButton value={spUrl} label="Copy Solana Pay URL" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Received" tone={st === 'paid' ? 'violet' : undefined}>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Amount received">
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="received">
            <b>
              {fromBase(total, token.decimals, 6)} {token.symbol}
            </b>
            {link.amount ? ` of ${fromBase(BigInt(link.amount), token.decimals)} ${token.symbol}` : ' received'}
          </p>
          {link.payments.length ? (
            <ul className="list">
              {link.payments.map((p) => (
                <li key={p.sig} className="list__row">
                  <span>
                    <span className="list__title">
                      +{fromBase(BigInt(p.amount), token.decimals, 6)} {token.symbol}
                    </span>
                    <span className="list__sub">
                      from <span className="mono">{p.from[0] ? short(p.from[0]) : 'unknown'}</span> · {timeAgo(p.blockTime)}
                    </span>
                  </span>
                  <span className="list__actions">
                    <Link className="link-btn" to={`/app/proofs?tx=${p.sig}&index=${link.index}`}>
                      Prove
                    </Link>
                    <ExplorerLink kind="tx" id={p.sig}>
                      <span className="sr-only">View transaction</span>
                    </ExplorerLink>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Watching the network. A payment appears here within a few seconds of confirmation.
            </p>
          )}
          <dl className="kv kv--tight">
            <div>
              <dt>Balance at this address</dt>
              <dd>{holdings.data ? `${fromBase(balance, token.decimals, 6)} ${token.symbol}` : '…'}</dd>
            </div>
          </dl>
          <div className="btn-row">
            <Link className="btn btn--dark btn--sm" to={`/app/send?from=${link.index}&asset=${token.symbol}`}>
              Move funds
            </Link>
            <Link className="btn btn--line btn--sm" to={`/app/shield?from=${link.index}`}>
              Shield to Zcash
            </Link>
          </div>
          <p className="muted small-print">
            The payer's own wallet is public on-chain. Your main wallet does not appear in this payment. Moving these funds to your
            main wallet links them, so prefer the Shield or a new fresh address.
          </p>
        </Panel>
      </div>
    </>
  )
}

export function PayLinkDetail() {
  const { id } = useParams()
  const [links] = usePayLinks()
  const link = links.find((l) => l.id === id)
  return (
    <div className="page">
      <Link to="/app/receive" className="back-link">
        <AppIcon name="back" />
        Pay links
      </Link>
      <RequireWallet>
        {link ? (
          <Detail link={link} />
        ) : (
          <Empty icon="link" title="Pay link not found" action={<Link className="btn btn--dark" to="/app/receive">Back to pay links</Link>}>
            It may belong to another wallet or network, or this device's data was cleared.
          </Empty>
        )}
      </RequireWallet>
    </div>
  )
}
