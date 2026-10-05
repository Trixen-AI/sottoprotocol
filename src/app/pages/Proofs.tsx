import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { ProofResult } from '../components/ProofResult'
import { RequireWallet } from '../components/gates'
import { CopyButton, Field, Notice, PageHeader, Panel, Segmented, Spinner } from '../components/ui'
import { errorText, fromBase, short } from '../lib/format'
import { decodeProof, encodeProof, signWithKeypair, signWithWallet, type Proof, type ProofBody } from '../lib/proof'
import { getParsedTx, summarize, type TxSummary } from '../lib/solana'
import { tokenByMint } from '../lib/tokens'
import type { NetworkId } from '../config'
import { useSolana } from '../state/solana'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

type Incoming = { asset: string; amount: bigint; decimals: number; symbol: string }

function incomingOf(s: TxSummary, net: NetworkId): Incoming[] {
  const out: Incoming[] = []
  if (s.sol > 0n) out.push({ asset: 'SOL', amount: s.sol, decimals: 9, symbol: 'SOL' })
  for (const t of s.tokens) {
    if (t.delta > 0n) out.push({ asset: t.mint, amount: t.delta, decimals: t.decimals, symbol: tokenByMint(net, t.mint)?.symbol ?? short(t.mint) })
  }
  return out
}

function CreateProof({ owner }: { owner: string }) {
  const [params] = useSearchParams()
  const { connection, network } = useSolana()
  const { signMessage } = useWallet()
  const vault = useVault()
  const indexParam = params.get('index')
  const [receiver, setReceiver] = useState<string>(indexParam ?? 'main')
  const [sig, setSig] = useState(params.get('tx') ?? '')
  const [statement, setStatement] = useState('')
  const [loaded, setLoaded] = useState<{ summary: TxSummary; incoming: Incoming[]; address: string } | null>(null)
  const [assetIdx, setAssetIdx] = useState(0)
  const [busy, setBusy] = useState<'load' | 'sign' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [proof, setProof] = useState<Proof | null>(null)

  const receiverAddress = receiver === 'main' ? owner : vault.addresses.find((a) => String(a.index) === receiver)?.address

  const load = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    setProof(null)
    setLoaded(null)
    try {
      if (!receiverAddress) throw new Error('Choose the address that received the payment.')
      if (sig.trim().length < 64) throw new Error('Paste a transaction signature.')
      setBusy('load')
      const tx = await getParsedTx(connection, sig.trim())
      if (!tx) throw new Error('Transaction not found on this network.')
      if (tx.meta?.err) throw new Error('This transaction failed on-chain.')
      const summary = summarize(tx, sig.trim(), receiverAddress)
      const incoming = incomingOf(summary, network)
      if (!incoming.length) throw new Error('This address did not receive anything in that transaction.')
      if (!summary.counterparties.length) throw new Error('Could not tell where this payment came from.')
      setLoaded({ summary, incoming, address: receiverAddress })
      setAssetIdx(0)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  const sign = async () => {
    if (!loaded) return
    setError(null)
    try {
      const inc = loaded.incoming[assetIdx]
      const body: ProofBody = {
        v: 1,
        kind: 'sotto-payment-proof',
        net: network,
        tx: loaded.summary.signature,
        recipient: loaded.address,
        from: loaded.summary.counterparties,
        asset: inc.asset,
        amount: inc.amount.toString(),
        blockTime: loaded.summary.blockTime,
        statement: statement.trim() || undefined,
        issuedAt: Math.floor(Date.now() / 1000),
      }
      setBusy('sign')
      if (receiver === 'main') {
        setProof(await signWithWallet(body, signMessage))
      } else {
        if (!vault.unlocked && !(await vault.unlock())) return
        setProof(signWithKeypair(body, vault.keypair(Number(receiver))))
      }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  const link = proof ? `${window.location.origin}/proof/${encodeProof(proof)}` : ''

  return (
    <div className={proof ? 'cols cols--form' : 'narrow'}>
      <Panel title="Prove where a payment came from">
        <form className="form" onSubmit={load}>
          <Field label="Received by" htmlFor="pf-recv">
            <select id="pf-recv" className="input" value={receiver} onChange={(e) => (setReceiver(e.target.value), setLoaded(null))}>
              <option value="main">Main wallet · {short(owner)}</option>
              {vault.addresses.map((a) => (
                <option key={a.index} value={String(a.index)}>
                  Fresh #{a.index} {a.label ? `· ${a.label}` : ''} · {short(a.address)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Transaction signature" htmlFor="pf-sig" hint="Find it in a pay link's received list, or in any explorer.">
            <input id="pf-sig" className="input mono" value={sig} onChange={(e) => (setSig(e.target.value), setLoaded(null))} autoComplete="off" />
          </Field>
          <Field label="Statement (optional)" htmlFor="pf-st" hint="Added to the proof and covered by the signature.">
            <input id="pf-st" className="input" maxLength={140} placeholder="Payment for invoice 0042" value={statement} onChange={(e) => setStatement(e.target.value)} />
          </Field>
          {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}
          {loaded ? (
            <div className="loaded">
              <p className="field__label">Payment found</p>
              {loaded.incoming.length > 1 ? (
                <Segmented
                  label="Asset"
                  value={String(assetIdx)}
                  onChange={(v) => setAssetIdx(Number(v))}
                  options={loaded.incoming.map((i, n) => ({ value: String(n), label: i.symbol }))}
                />
              ) : null}
              <dl className="kv kv--tight">
                <div>
                  <dt>Amount</dt>
                  <dd>
                    {fromBase(loaded.incoming[assetIdx].amount, loaded.incoming[assetIdx].decimals, 8)} {loaded.incoming[assetIdx].symbol}
                  </dd>
                </div>
                <div>
                  <dt>From</dt>
                  <dd className="mono">{loaded.summary.counterparties.map((c) => short(c, 6)).join(', ')}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn--dark" onClick={sign} disabled={busy !== null}>
                {busy === 'sign' ? <Spinner label="Signing" /> : <AppIcon name="proof" />}
                Sign proof
              </button>
            </div>
          ) : (
            <button type="submit" className="btn btn--dark" disabled={busy !== null}>
              {busy === 'load' ? <Spinner label="Loading" /> : <AppIcon name="refresh" />}
              Load payment
            </button>
          )}
        </form>
      </Panel>
      <div className="stack">
        {proof ? (
          <Panel title="Your proof" tone="violet">
            <ProofResult proof={proof} />
            <div className="copy-row">
              <input className="input mono" readOnly value={link} aria-label="Proof link" onFocus={(e) => e.currentTarget.select()} />
              <CopyButton value={link} label="Copy link" />
            </div>
            <div className="btn-row">
              <a
                className="btn btn--line btn--sm"
                download={`sotto-proof-${proof.body.tx.slice(0, 8)}.json`}
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(proof, null, 2))}`}
              >
                Download JSON
              </a>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  )
}

function VerifyProof() {
  const [input, setInput] = useState('')
  const [proof, setProof] = useState<Proof | null>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="cols cols--form">
      <Panel title="Verify a proof">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            setProof(null)
            try {
              setProof(decodeProof(input))
            } catch (err) {
              setError(errorText(err))
            }
          }}
        >
          <Field label="Proof link, code or JSON" htmlFor="vf-in">
            <textarea id="vf-in" className="input textarea mono" rows={5} value={input} onChange={(e) => setInput(e.target.value)} />
          </Field>
          {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}
          <button type="submit" className="btn btn--dark" disabled={!input.trim()}>
            Verify
          </button>
        </form>
      </Panel>
      <div className="stack">{proof ? <Panel title="Result"><ProofResult key={proof.sig} proof={proof} /></Panel> : null}</div>
    </div>
  )
}

export function Proofs() {
  const { address } = useWallet()
  const [tab, setTab] = useState<'create' | 'verify'>('create')
  return (
    <div className="page">
      <PageHeader title="Proofs" text="Share proof of where a payment came from, without handing over your keys.">
        <Segmented<'create' | 'verify'>
          label="Proof mode"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'create', label: 'Create' },
            { value: 'verify', label: 'Verify' },
          ]}
        />
      </PageHeader>
      {tab === 'verify' ? <VerifyProof /> : <RequireWallet>{address ? <CreateProof owner={address} /> : null}</RequireWallet>}
    </div>
  )
}
