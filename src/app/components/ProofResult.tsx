import { useEffect, useState } from 'react'
import { explorerUrl, NETWORK_LABEL } from '../config'
import { dateTime, errorText, fromBase, short } from '../lib/format'
import { verifyProof, type Check, type Proof } from '../lib/proof'
import { tokenByMint } from '../lib/tokens'
import { useSolana } from '../state/solana'
import { AppIcon } from './AppIcon'
import { Notice, Pill, Spinner } from './ui'

/** Verifies a proof against the chain and shows each check. */
export function ProofResult({ proof }: { proof: Proof }) {
  const { connectionFor } = useSolana()
  const [checks, setChecks] = useState<Check[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const b = proof.body
  const token = b.asset === 'SOL' ? tokenByMint(b.net, null) : tokenByMint(b.net, b.asset)
  const decimals = token?.decimals ?? (b.asset === 'SOL' ? 9 : 0)

  useEffect(() => {
    let alive = true
    verifyProof(connectionFor(b.net), proof)
      .then((c) => alive && setChecks(c))
      .catch((e) => alive && setError(errorText(e)))
    return () => {
      alive = false
    }
  }, [proof, b.net, connectionFor])

  const allOk = checks?.every((c) => c.ok)

  return (
    <div className="proof">
      <div className="proof__head">
        <p className="proof__amount">
          {fromBase(BigInt(b.amount), decimals, 8)} {token?.symbol ?? short(b.asset)}
        </p>
        {checks ? (
          <Pill tone={allOk ? 'good' : 'bad'}>{allOk ? 'Verified on-chain' : 'Does not verify'}</Pill>
        ) : error ? (
          <Pill tone="bad">Could not verify</Pill>
        ) : (
          <Pill tone="accent">
            <Spinner label="Verifying" /> Verifying
          </Pill>
        )}
      </div>
      <dl className="kv">
        <div>
          <dt>Came from</dt>
          <dd className="mono break">{b.from.join(', ') || 'unknown'}</dd>
        </div>
        <div>
          <dt>Received by</dt>
          <dd className="mono break">{b.recipient}</dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>{b.blockTime ? dateTime(b.blockTime) : 'unknown'}</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>{NETWORK_LABEL[b.net]}</dd>
        </div>
        {b.statement ? (
          <div>
            <dt>Statement</dt>
            <dd>“{b.statement}”</dd>
          </div>
        ) : null}
        <div>
          <dt>Transaction</dt>
          <dd>
            <a className="ext-link" href={explorerUrl(b.net, 'tx', b.tx)} target="_blank" rel="noopener noreferrer">
              {short(b.tx, 8)}
              <AppIcon name="external" />
            </a>
          </dd>
        </div>
      </dl>
      {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}
      {checks ? (
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? 'is-ok' : 'is-bad'}>
              <AppIcon name={c.ok ? 'check' : 'close'} />
              <span>
                <b>{c.label}</b>
                {c.detail ? <span className="checks__detail">{c.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="muted small-print">
        This proof reveals only this payment. It contains no keys and says nothing about other addresses held by the same person.
      </p>
    </div>
  )
}
