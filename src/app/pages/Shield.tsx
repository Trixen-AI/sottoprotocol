import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { RequireWallet, UnlockCard } from '../components/gates'
import { CopyButton, Empty, ExplorerLink, Field, Notice, PageHeader, Panel, Pill, QRCode, Segmented, Spinner } from '../components/ui'
import { TokenSelect } from '../components/walletBits'
import { errorText, fromBase, short, timeAgo, toBase } from '../lib/format'
import { FINAL_STATUSES, requestQuote, statusLabel, submitDeposit, type Quote } from '../lib/oneclick'
import { useHoldings } from '../lib/queries'
import { BASE_FEE, buildTransfer, checkSolTransfer, confirmSignature, holdingOf, sendWithKeypair } from '../lib/solana'
import { useStored } from '../lib/storage'
import { SOL, ZEC_DECIMALS, ZEC_NATIVE_ASSET, tokenBySymbol } from '../lib/tokens'
import { invalidate } from '../lib/useResource'
import { stamp, useNow } from '../lib/useNow'
import { keys } from '../state/keys'
import { useSolana } from '../state/solana'
import { useSwaps, type SwapRecord } from '../state/swaps'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString()

function QuoteSummary({ q, outSymbol, inSymbol }: { q: Quote; outSymbol: string; inSymbol: string }) {
  return (
    <dl className="kv quote">
      <div>
        <dt>You send</dt>
        <dd>
          {q.amountInFormatted} {inSymbol}
          {q.amountInUsd ? <span className="muted"> · ${Number(q.amountInUsd).toFixed(2)}</span> : null}
        </dd>
      </div>
      <div>
        <dt>You receive about</dt>
        <dd>
          <b>
            {q.amountOutFormatted} {outSymbol}
          </b>
          {q.amountOutUsd ? <span className="muted"> · ${Number(q.amountOutUsd).toFixed(2)}</span> : null}
        </dd>
      </div>
      {q.timeEstimate ? (
        <div>
          <dt>Usually takes</dt>
          <dd>about {Math.max(1, Math.round(q.timeEstimate / 60))} min</dd>
        </div>
      ) : null}
      <div>
        <dt>Route fees</dt>
        <dd>Included in the quote. Slippage limit 1%.</dd>
      </div>
    </dl>
  )
}

function ToZcash({ owner }: { owner: string }) {
  const [params] = useSearchParams()
  const { connection, network, tokens } = useSolana()
  const { sendTransaction } = useWallet()
  const vault = useVault()
  const [, setSwaps] = useSwaps()
  const [zAddr, setZAddr] = useStored(keys.zcashAddress(owner), '')
  const fromParam = params.get('from')
  const [source, setSource] = useState<'main' | 'fresh'>(fromParam !== null ? 'fresh' : 'main')
  const [freshIndex, setFreshIndex] = useState(fromParam !== null ? Number(fromParam) : (vault.addresses[0]?.index ?? 0))
  const [symbol, setSymbol] = useState('SOL')
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [busy, setBusy] = useState<'quote' | 'send' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const routeTokens = tokens.filter((t) => t.oneClickAsset)
  const token = tokenBySymbol(network, symbol) ?? SOL
  const fresh = vault.addresses.find((a) => a.index === freshIndex)
  const fromAddress = source === 'main' ? owner : (fresh?.address ?? null)
  const holdings = useHoldings(fromAddress)
  const balance = holdingOf(holdings.data, token)
  const solBalance = holdingOf(holdings.data, SOL)

  const inputs = () => {
    if (!fromAddress) throw new Error('Choose a fresh address to send from.')
    if (zAddr.trim().length < 26) throw new Error('Enter your Zcash address.')
    const raw = toBase(amount, token.decimals)
    if (raw <= 0n) throw new Error('Enter an amount above zero.')
    return { raw, from: fromAddress }
  }

  const preview = async () => {
    setError(null)
    setQuote(null)
    try {
      const { raw, from } = inputs()
      setBusy('quote')
      const r = await requestQuote({
        dry: true,
        originAsset: token.oneClickAsset!,
        destinationAsset: ZEC_NATIVE_ASSET,
        amount: raw.toString(),
        refundTo: from,
        recipient: zAddr.trim(),
        deadline: inMinutes(30),
      })
      setQuote(r.quote)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const shield = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(null)
    try {
      const { raw, from } = inputs()
      if (!holdings.data) throw new Error('Balances are still loading.')
      if (token.mint) {
        if (raw > balance) throw new Error(`Not enough ${token.symbol}.`)
        if (solBalance < BASE_FEE + 2_039_280n) throw new Error('The sending address needs about 0.0021 SOL for network fees.')
      } else {
        // the route's deposit address may be new, so the same rent rules apply
        await checkSolTransfer(connection, from, from, raw, balance)
      }
      if (source === 'fresh' && !vault.unlocked) throw new Error('Unlock your vault first.')
      setBusy('send')
      const deadline = inMinutes(30)
      const { quote: q } = await requestQuote({
        dry: false,
        originAsset: token.oneClickAsset!,
        destinationAsset: ZEC_NATIVE_ASSET,
        amount: raw.toString(),
        refundTo: from,
        recipient: zAddr.trim(),
        deadline,
      })
      if (!q.depositAddress) throw new Error('The route did not return a deposit address. Try again.')
      const tx = await buildTransfer(connection, { from, to: q.depositAddress, token, amount: raw })
      let sig: string
      if (source === 'main') {
        sig = await sendTransaction(tx, connection)
        await confirmSignature(connection, sig)
      } else {
        sig = await sendWithKeypair(connection, tx, vault.keypair(freshIndex))
      }
      void submitDeposit(sig, q.depositAddress)
      const record: SwapRecord = {
        id: crypto.randomUUID(),
        direction: 'toZcash',
        createdAt: stamp(),
        depositAddress: q.depositAddress,
        assetIn: token.symbol,
        amountIn: q.amountInFormatted,
        amountOut: q.amountOutFormatted,
        recipient: zAddr.trim(),
        refundTo: from,
        deadline,
        txSig: sig,
        status: 'KNOWN_DEPOSIT_TX',
      }
      setSwaps((prev) => [record, ...prev])
      setDone(`Deposit sent. About ${q.amountOutFormatted} ZEC is on its way to your Zcash address.`)
      setQuote(null)
      setAmount('')
      invalidate(`${network}:holdings`)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  const needsUnlock = source === 'fresh' && !vault.unlocked
  return (
    <div className={needsUnlock ? 'cols cols--form' : 'narrow'}>
      <Panel title="Solana to shielded Zcash">
        <form className="form" onSubmit={shield}>
          <Field label="From">
            <Segmented<'main' | 'fresh'>
              label="Shield from"
              value={source}
              onChange={setSource}
              options={[
                { value: 'main', label: 'Main wallet' },
                { value: 'fresh', label: 'Fresh address', disabled: !vault.addresses.length },
              ]}
            />
          </Field>
          {source === 'fresh' ? (
            <Field label="Fresh address" htmlFor="sh-fresh">
              <select id="sh-fresh" className="input" value={freshIndex} onChange={(e) => setFreshIndex(Number(e.target.value))}>
                {vault.addresses.map((a) => (
                  <option key={a.index} value={a.index}>
                    #{a.index} {a.label ? `· ${a.label}` : ''} · {short(a.address)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="form__row">
            <Field label="Asset" htmlFor="sh-asset">
              <TokenSelect id="sh-asset" value={symbol} onChange={(s) => (setSymbol(s), setQuote(null))} tokens={routeTokens} />
            </Field>
            <Field label="Amount" htmlFor="sh-amount" hint={holdings.data ? `Available: ${fromBase(balance, token.decimals, 6)} ${token.symbol}` : 'Loading balance…'}>
              <input
                id="sh-amount"
                className="input mono"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => (setAmount(e.target.value), setQuote(null))}
              />
            </Field>
          </div>
          <Field
            label="Your Zcash address"
            htmlFor="sh-z"
            hint="A shielded (unified) address from your Zcash wallet. If the route rejects it, use your transparent address and shield it in your Zcash wallet."
          >
            <input id="sh-z" className="input mono" placeholder="u1… or t1…" value={zAddr} onChange={(e) => (setZAddr(e.target.value), setQuote(null))} autoComplete="off" />
          </Field>
          {quote ? <QuoteSummary q={quote} inSymbol={token.symbol} outSymbol="ZEC" /> : null}
          {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}
          {done ? <Notice tone="good" icon="check">{done}</Notice> : null}
          <div className="btn-row">
            <button type="button" className="btn btn--line" onClick={preview} disabled={busy !== null}>
              {busy === 'quote' ? <Spinner label="Getting a quote" /> : <AppIcon name="refresh" />}
              Get quote
            </button>
            <button type="submit" className="btn btn--dark" disabled={busy !== null || !quote || (source === 'fresh' && !vault.unlocked)}>
              {busy === 'send' ? <Spinner label="Shielding" /> : <AppIcon name="shield" />}
              {busy === 'send' ? 'Confirm and wait' : 'Shield now'}
            </button>
          </div>
        </form>
      </Panel>
      {needsUnlock ? <UnlockCard why="Shielding from a fresh address signs with its key, derived when you unlock." /> : null}
    </div>
  )
}

function ToSolana({ owner }: { owner: string }) {
  const vault = useVault()
  const [swaps, setSwaps] = useSwaps()
  const [zAddr, setZAddr] = useStored(keys.zcashAddress(owner), '')
  const [dest, setDest] = useState<'new' | 'main' | 'fresh'>('new')
  const [freshIndex, setFreshIndex] = useState(vault.addresses[0]?.index ?? 0)
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [busy, setBusy] = useState<'quote' | 'create' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recipientNow = () => {
    if (dest === 'main') return owner
    if (dest === 'fresh') {
      const a = vault.addresses.find((x) => x.index === freshIndex)
      if (!a) throw new Error('Choose a fresh address.')
      return a.address
    }
    return null
  }

  const base = () => {
    const raw = toBase(amount, ZEC_DECIMALS)
    if (raw <= 0n) throw new Error('Enter an amount above zero.')
    if (zAddr.trim().length < 26) throw new Error('Enter a Zcash address for refunds.')
    return raw
  }

  const preview = async () => {
    setError(null)
    setQuote(null)
    try {
      const raw = base()
      setBusy('quote')
      const r = await requestQuote({
        dry: true,
        originAsset: ZEC_NATIVE_ASSET,
        destinationAsset: SOL.oneClickAsset!,
        amount: raw.toString(),
        refundTo: zAddr.trim(),
        recipient: recipientNow() ?? owner,
        deadline: inMinutes(120),
      })
      setQuote(r.quote)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const raw = base()
      let recipient = recipientNow()
      if (dest === 'new') {
        if (!vault.unlocked && !(await vault.unlock())) return
        recipient = vault.create('From Zcash').address
      }
      setBusy('create')
      const deadline = inMinutes(120)
      const { quote: q } = await requestQuote({
        dry: false,
        originAsset: ZEC_NATIVE_ASSET,
        destinationAsset: SOL.oneClickAsset!,
        amount: raw.toString(),
        refundTo: zAddr.trim(),
        recipient: recipient!,
        deadline,
      })
      if (!q.depositAddress) throw new Error('The route did not return a deposit address. Try again.')
      setSwaps((prev) => [
        {
          id: crypto.randomUUID(),
          direction: 'toSolana',
          createdAt: stamp(),
          depositAddress: q.depositAddress!,
          depositMemo: q.depositMemo,
          assetIn: 'ZEC',
          amountIn: q.amountInFormatted,
          amountOut: q.amountOutFormatted,
          recipient: recipient!,
          refundTo: zAddr.trim(),
          deadline,
          status: 'PENDING_DEPOSIT',
        },
        ...prev,
      ])
      setQuote(null)
      setAmount('')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  const now = useNow()
  const waiting = swaps.filter((s) => s.direction === 'toSolana' && s.status === 'PENDING_DEPOSIT' && new Date(s.deadline).getTime() > now)

  return (
    <div className={waiting.length ? 'cols cols--form' : 'narrow'}>
      <Panel title="Shielded Zcash back to Solana">
        <form className="form" onSubmit={create}>
          <Field label="Amount of ZEC" htmlFor="ts-amount">
            <input id="ts-amount" className="input mono" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => (setAmount(e.target.value), setQuote(null))} />
          </Field>
          <Field label="Deliver SOL to">
            <Segmented<'new' | 'main' | 'fresh'>
              label="Deliver to"
              value={dest}
              onChange={(v) => (setDest(v), setQuote(null))}
              options={[
                { value: 'new', label: 'New fresh address' },
                { value: 'fresh', label: 'Existing fresh', disabled: !vault.addresses.length },
                { value: 'main', label: 'Main wallet' },
              ]}
            />
          </Field>
          {dest === 'fresh' ? (
            <Field label="Fresh address" htmlFor="ts-fresh">
              <select id="ts-fresh" className="input" value={freshIndex} onChange={(e) => setFreshIndex(Number(e.target.value))}>
                {vault.addresses.map((a) => (
                  <option key={a.index} value={a.index}>
                    #{a.index} {a.label ? `· ${a.label}` : ''} · {short(a.address)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Zcash refund address" htmlFor="ts-z" hint="Where the route sends your ZEC back if the transfer can't complete.">
            <input id="ts-z" className="input mono" placeholder="u1… or t1…" value={zAddr} onChange={(e) => setZAddr(e.target.value)} autoComplete="off" />
          </Field>
          {quote ? <QuoteSummary q={quote} inSymbol="ZEC" outSymbol="SOL" /> : null}
          {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}
          <div className="btn-row">
            <button type="button" className="btn btn--line" onClick={preview} disabled={busy !== null}>
              {busy === 'quote' ? <Spinner label="Getting a quote" /> : <AppIcon name="refresh" />}
              Get quote
            </button>
            <button type="submit" className="btn btn--dark" disabled={busy !== null || !quote}>
              {busy === 'create' ? <Spinner label="Creating deposit address" /> : <AppIcon name="arrowIn" />}
              Get deposit address
            </button>
          </div>
        </form>
      </Panel>
      {waiting.length ? (
        <div className="stack">
          {waiting.map((s) => (
            <DepositCard key={s.id} s={s} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DepositCard({ s }: { s: SwapRecord }) {
  const uri = `zcash:${s.depositAddress}?amount=${s.amountIn}`
  return (
    <Panel title="Send ZEC to this address" tone="gold">
      <div className="share share--stack">
        <QRCode value={uri} size={180} />
        <dl className="kv">
          <div>
            <dt>Amount</dt>
            <dd>
              <b>{s.amountIn} ZEC</b>
            </dd>
          </div>
          <div>
            <dt>Deposit address</dt>
            <dd className="mono break">{s.depositAddress}</dd>
          </div>
          {s.depositMemo ? (
            <div>
              <dt>Memo</dt>
              <dd className="mono">{s.depositMemo}</dd>
            </div>
          ) : null}
          <div>
            <dt>Send before</dt>
            <dd>{new Date(s.deadline).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</dd>
          </div>
        </dl>
        <div className="btn-row">
          <CopyButton value={s.depositAddress} label="Copy address" />
          <CopyButton value={s.amountIn} label="Copy amount" />
        </div>
        <p className="muted small-print">Status updates here automatically: {statusLabel(s.status)}.</p>
      </div>
    </Panel>
  )
}

function History() {
  const [swaps] = useSwaps()
  if (!swaps.length) {
    return (
      <Panel title="Transfers">
        <Empty icon="shield" title="No transfers yet">
          Shield funds to Zcash or bring ZEC back, and each transfer is tracked here.
        </Empty>
      </Panel>
    )
  }
  return (
    <Panel title="Transfers">
      <ul className="list">
        {swaps.map((s) => {
          const final = FINAL_STATUSES.has(s.status ?? '')
          return (
            <li key={s.id} className="list__row list__row--wrap">
              <span>
                <span className="list__title">
                  {s.amountIn} {s.assetIn} → {s.amountOut} {s.direction === 'toZcash' ? 'ZEC' : 'SOL'}
                </span>
                <span className="list__sub">
                  {s.direction === 'toZcash' ? 'Solana to Zcash' : 'Zcash to Solana'} · to <span className="mono">{short(s.recipient, 6)}</span> ·{' '}
                  {timeAgo(s.createdAt / 1000)}
                </span>
              </span>
              <span className="list__actions">
                <Pill tone={s.status === 'SUCCESS' ? 'good' : s.status === 'REFUNDED' || s.status === 'FAILED' ? 'bad' : 'accent'}>
                  {!final ? <Spinner label="Tracking" /> : null}
                  {statusLabel(s.status)}
                </Pill>
                {s.txSig ? (
                  <ExplorerLink kind="tx" id={s.txSig}>
                    <span className="sr-only">View deposit</span>
                  </ExplorerLink>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export function Shield() {
  const { address } = useWallet()
  const [dir, setDir] = useState<'toZcash' | 'toSolana'>('toZcash')
  return (
    <div className="page">
      <PageHeader title="The Shield" text="Move private funds into Zcash's shielded pool, and bring them back as SOL.">
        <Segmented<'toZcash' | 'toSolana'>
          label="Direction"
          value={dir}
          onChange={setDir}
          options={[
            { value: 'toZcash', label: 'Solana → Zcash' },
            { value: 'toSolana', label: 'Zcash → Solana' },
          ]}
        />
      </PageHeader>
        <RequireWallet>
          {address ? (
            <>
              {dir === 'toZcash' ? <ToZcash owner={address} /> : <ToSolana owner={address} />}
              <History />
            </>
          ) : null}
        </RequireWallet>
    </div>
  )
}
