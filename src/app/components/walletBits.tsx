import { fromBase, short, timeAgo } from '../lib/format'
import type { TxSummary } from '../lib/solana'
import { SOL, tokenByMint, type Token } from '../lib/tokens'
import { useSolana } from '../state/solana'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'
import { AppIcon } from './AppIcon'
import { ExplorerLink, Pill } from './ui'

export function ConnectButton() {
  const { configured, address, walletName, connect, manage } = useWallet()
  if (!configured) return <Pill tone="warn">Wallet not configured</Pill>
  if (!address) {
    return (
      <button type="button" className="btn btn--dark btn--sm" onClick={connect}>
        Connect wallet
      </button>
    )
  }
  return (
    <button type="button" className="wallet-chip" onClick={manage} title={address}>
      <span className="wallet-chip__dot" aria-hidden="true" />
      <span className="mono">{short(address)}</span>
      {walletName ? <span className="wallet-chip__name">{walletName}</span> : null}
    </button>
  )
}

export function TokenSelect({ value, onChange, tokens, id }: { value: string; onChange: (s: string) => void; tokens: Token[]; id?: string }) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {tokens.map((t) => (
        <option key={t.symbol} value={t.symbol}>
          {t.symbol} · {t.name}
        </option>
      ))}
    </select>
  )
}

/** One line per transaction: direction, amount, counterparty, time. */
export function ActivityList({ items, empty = 'No transactions yet.' }: { items: TxSummary[] | undefined; address?: string; empty?: string }) {
  const { network } = useSolana()
  const { labelOf } = useVault()
  if (!items) return null
  if (!items.length) return <p className="muted">{empty}</p>
  return (
    <ul className="activity">
      {items.map((t) => {
        const tok = t.tokens[0]
        const token = tok ? tokenByMint(network, tok.mint) : SOL
        const raw = tok ? tok.delta : t.sol
        const decimals = tok ? tok.decimals : 9
        const incoming = raw > 0n
        const other = t.counterparties[0]
        const label = other ? labelOf(other) : undefined
        return (
          <li key={t.signature} className="activity__row">
            <span className={`activity__dir ${incoming ? 'is-in' : raw < 0n ? 'is-out' : ''}`}>
              <AppIcon name={incoming ? 'arrowIn' : raw < 0n ? 'arrowOut' : 'swap'} />
            </span>
            <span className="activity__main">
              <span className="activity__what">
                {!t.ok ? 'Failed transaction' : raw === 0n ? 'Program interaction' : incoming ? 'Received' : 'Sent'}
                {raw !== 0n ? (
                  <b>
                    {' '}
                    {fromBase(incoming ? raw : -raw, decimals, 6)} {token?.symbol ?? short(tok?.mint ?? '', 3)}
                  </b>
                ) : null}
              </span>
              <span className="activity__sub">
                {other ? (
                  <>
                    {incoming ? 'from ' : 'to '}
                    <span className="mono">{label ?? short(other)}</span>
                    {t.counterparties.length > 1 ? ` +${t.counterparties.length - 1}` : ''}
                    {' · '}
                  </>
                ) : null}
                {timeAgo(t.blockTime)}
              </span>
            </span>
            <ExplorerLink kind="tx" id={t.signature}>
              <span className="sr-only">View transaction</span>
            </ExplorerLink>
          </li>
        )
      })}
    </ul>
  )
}
