import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { PublicShell } from '../layout/PublicShell'
import { AppIcon } from '../components/AppIcon'
import { SetupNotice } from '../components/gates'
import { ExplorerLink, Field, Notice, QRCode, Spinner } from '../components/ui'
import { ConnectButton } from '../components/walletBits'
import { NETWORK_LABEL } from '../config'
import { getHistory } from '../lib/blockscout'
import { buildTransfer, getHoldings, holdingOf, waitForTx } from '../lib/chain'
import { errorText, fromBase, short, toBase } from '../lib/format'
import { decodePayRequest, paymentUri, type PayRequest } from '../lib/paylink'
import { TOKENS, type Token } from '../lib/tokens'
import { useResource } from '../lib/useResource'
import { incomingPayments } from '../state/payLinks'
import { useChain } from '../state/chain'
import { useWallet } from '../state/wallet'

export function PayPage() {
  const { code = '' } = useParams()
  const parsed = useMemo(() => {
    try {
      return { ...decodePayRequest(code), error: null }
    } catch (e) {
      return { request: null, token: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [code])

  return (
    <PublicShell title="Payment request" text="Pay privately: this request points at a fresh address made for this payment only." right={<ConnectButton />}>
      {parsed.request && parsed.token ? <PayForm request={parsed.request} token={parsed.token} /> : <Notice tone="bad" icon="close">{parsed.error}</Notice>}
    </PublicShell>
  )
}

function PayForm({ request, token }: { request: PayRequest; token: Token }) {
  const { clientFor } = useChain()
  const wallet = useWallet()
  const client = clientFor(request.net)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paidSig, setPaidSig] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const fixed = request.amount ? BigInt(request.amount) : null

  // Each pay link has its own fresh address, so anything that arrived there is a payment for it.
  const received = useResource(
    `${request.net}:paid:${request.to}:${token.symbol}`,
    async () => incomingPayments(await getHistory(request.to, 20), token),
    { refreshMs: 12_000 },
  )
  const total = received.data?.reduce((s, p) => s + BigInt(p.amount), 0n) ?? 0n
  const alreadyPaid = received.data?.length && (fixed === null || total >= fixed) ? received.data[0].sig : null

  const payer = wallet.address
  const balances = useResource(payer ? `${request.net}:holdings:${payer}` : null, () => getHoldings(client, payer!, TOKENS[request.net]), {
    refreshMs: 30_000,
  })

  const pay = async () => {
    setError(null)
    try {
      if (!payer) throw new Error('Connect a wallet first.')
      const raw = fixed ?? toBase(amount, token.decimals)
      if (raw <= 0n) throw new Error('Enter an amount above zero.')
      const h = balances.data ?? (await getHoldings(client, payer, TOKENS[request.net]))
      if (raw > holdingOf(h, token)) throw new Error(`Not enough ${token.symbol} in your wallet.`)
      setBusy(true)
      const hash = await wallet.sendTransaction(buildTransfer(token, request.to, raw))
      await waitForTx(client, hash)
      setPaidSig(hash)
      received.refresh()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const done = paidSig ?? alreadyPaid

  return (
    <div className="pay">
      <div className="pay__amount">
        {fixed !== null ? (
          <p className="pay__big">
            {fromBase(fixed, token.decimals)} <span>{token.symbol}</span>
          </p>
        ) : (
          <Field label={`Amount in ${token.symbol}`} htmlFor="pay-amount">
            <input id="pay-amount" className="input input--big mono" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        )}
        {request.note ? <p className="pay__note">“{request.note}”</p> : null}
      </div>

      <dl className="kv">
        <div>
          <dt>Pays into</dt>
          <dd className="mono">{short(request.to, 6)}</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>{NETWORK_LABEL[request.net]}</dd>
        </div>
        {payer && balances.data ? (
          <div>
            <dt>Your balance</dt>
            <dd>
              {fromBase(holdingOf(balances.data, token), token.decimals, 6)} {token.symbol}
            </dd>
          </div>
        ) : null}
      </dl>

      {done ? (
        <Notice tone="good" icon="check">
          {paidSig ? 'Paid. ' : 'This request has already been paid. '}
          <ExplorerLink kind="tx" id={done}>
            View transaction
          </ExplorerLink>
        </Notice>
      ) : null}
      {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}

      {!wallet.configured ? (
        <SetupNotice />
      ) : !payer ? (
        <button type="button" className="btn btn--dark pay__cta" onClick={wallet.connect}>
          Connect wallet to pay
        </button>
      ) : (
        <button type="button" className="btn btn--dark pay__cta" onClick={pay} disabled={busy || Boolean(paidSig)}>
          {busy ? <Spinner label="Paying" /> : <AppIcon name="send" />}
          {busy ? 'Confirm in your wallet' : paidSig ? 'Paid' : 'Pay privately'}
        </button>
      )}

      <button type="button" className="link-btn pay__qr-toggle" onClick={() => setShowQr((v) => !v)}>
        {showQr ? 'Hide QR code' : 'Pay from your phone instead'}
      </button>
      {showQr ? (
        <div className="pay__qr">
          <QRCode value={paymentUri(request, token)} size={200} />
          <p className="muted small-print">Scan with any Ethereum wallet that reads payment QR codes.</p>
        </div>
      ) : null}
    </div>
  )
}
