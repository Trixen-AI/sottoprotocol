import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { AppIcon } from '../components/AppIcon'
import { RequireWallet, UnlockCard } from '../components/gates'
import { ExplorerLink, Field, Notice, PageHeader, Panel, Segmented, Spinner } from '../components/ui'
import { TokenSelect } from '../components/walletBits'
import { errorText, fromBase, short, toBase } from '../lib/format'
import { parsePayLink } from '../lib/paylink'
import { useHoldings } from '../lib/queries'
import { buildTransfer, gasCost, holdingOf, isAddress, maxEthSend, sameAddress, sendFromAccount, waitForTx } from '../lib/chain'
import { tokenBySymbol } from '../lib/tokens'
import { invalidate } from '../lib/useResource'
import { useChain } from '../state/chain'
import { useVault } from '../state/vault'
import { useWallet } from '../state/wallet'

function SendForm({ owner }: { owner: string }) {
  const [params] = useSearchParams()
  const { client, rpcUrl, network, tokens } = useChain()
  const { sendTransaction } = useWallet()
  const vault = useVault()
  const fromParam = params.get('from')
  const [source, setSource] = useState<'main' | 'fresh'>(fromParam !== null && fromParam !== 'main' ? 'fresh' : 'main')
  const [freshIndex, setFreshIndex] = useState<number>(fromParam && fromParam !== 'main' ? Number(fromParam) : (vault.addresses[0]?.index ?? 0))
  const [symbol, setSymbol] = useState(params.get('asset') ?? 'ETH')
  const [to, setTo] = useState(params.get('to') ?? '')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ sig: string; text: string } | null>(null)

  const link = parsePayLink(to)
  const linkForThisNet = link && link.request.net === network ? link : null
  const effectiveSymbol = linkForThisNet ? linkForThisNet.token.symbol : symbol
  const token = tokenBySymbol(network, effectiveSymbol) ?? tokens[0]
  const fresh = vault.addresses.find((a) => a.index === freshIndex)
  const fromAddress = source === 'main' ? owner : (fresh?.address ?? null)
  const recipient = linkForThisNet ? linkForThisNet.request.to : to.trim()
  const fixedAmount = linkForThisNet?.request.amount

  const holdings = useHoldings(fromAddress)
  const balance = holdingOf(holdings.data, token)
  const ethBalance = holdingOf(holdings.data, tokens[0])

  const ownFresh = vault.addresses.find((a) => sameAddress(a.address, recipient))
  const linkWarning =
    source === 'main' && ownFresh
      ? `This sends from your main wallet to your own fresh address #${ownFresh.index}, which links the two on-chain.`
      : source === 'fresh' && sameAddress(recipient, owner)
        ? 'This moves funds from a fresh address into your main wallet, which links the two on-chain. The Shield or a new fresh address keeps them apart.'
        : null

  const setMax = async () => {
    if (!holdings.data) return
    const max = token.contract ? balance : await maxEthSend(client, balance)
    setAmount(fromBase(max, token.decimals).replace(/,/g, ''))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(null)
    try {
      if (link && link.request.net !== network) throw new Error(`This pay link is for ${link.request.net}. Switch network first.`)
      if (!fromAddress) throw new Error('Choose a fresh address to send from.')
      if (!isAddress(recipient)) throw new Error('Enter a valid Ethereum address or a Zephyra OS pay link.')
      if (sameAddress(recipient, fromAddress)) throw new Error('The recipient is the same as the sender.')
      const raw = fixedAmount ? BigInt(fixedAmount) : toBase(amount, token.decimals)
      if (raw <= 0n) throw new Error('Enter an amount above zero.')
      if (!holdings.data) throw new Error('Balances are still loading.')
      if (raw > balance) throw new Error(`Not enough ${token.symbol} at this address.`)
      const req = buildTransfer(token, recipient, raw)
      if (source === 'fresh') {
        // a fresh address pays its own gas in ETH
        const gas = await gasCost(client, fromAddress, req)
        if (ethBalance < gas + (token.contract ? 0n : raw)) {
          throw new Error(`This fresh address needs about ${fromBase(gas, 18, 6)} ETH for gas on top of the amount. It has ${fromBase(ethBalance, 18, 6)} ETH.`)
        }
      }
      setBusy(true)
      let sig: string
      if (source === 'main') {
        const hash = await sendTransaction(req)
        await waitForTx(client, hash)
        sig = hash
      } else {
        if (!vault.unlocked) throw new Error('Unlock your vault first.')
        sig = await sendFromAccount(rpcUrl, client, vault.account(freshIndex), req)
      }
      setDone({ sig, text: `Sent ${fromBase(raw, token.decimals)} ${token.symbol} to ${short(recipient)}` })
      setAmount('')
      invalidate(`${network}:holdings`)
      invalidate(`${network}:history`)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const needsUnlock = source === 'fresh' && !vault.unlocked
  return (
    <div className={needsUnlock ? 'cols cols--form' : 'narrow'}>
      <Panel title="Send">
        <form className="form" onSubmit={submit}>
          <Field label="From">
            <Segmented<'main' | 'fresh'>
              label="Send from"
              value={source}
              onChange={setSource}
              options={[
                { value: 'main', label: 'Main wallet' },
                { value: 'fresh', label: 'Fresh address', disabled: !vault.addresses.length },
              ]}
            />
          </Field>
          {source === 'fresh' ? (
            <Field label="Fresh address" htmlFor="send-fresh">
              <select id="send-fresh" className="input" value={freshIndex} onChange={(e) => setFreshIndex(Number(e.target.value))}>
                {vault.addresses.map((a) => (
                  <option key={a.index} value={a.index}>
                    #{a.index} {a.label ? `· ${a.label}` : ''} · {short(a.address)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field
            label="To"
            htmlFor="send-to"
            hint={linkForThisNet ? `Paying a Zephyra OS link${linkForThisNet.request.note ? `: ${linkForThisNet.request.note}` : ''}` : 'An Ethereum address or a Zephyra OS pay link.'}
            error={link && link.request.net !== network ? `This pay link is for ${link.request.net}.` : null}
          >
            <input id="send-to" className="input mono" placeholder="0x… address or pay link" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" />
          </Field>
          <div className="form__row">
            <Field label="Asset" htmlFor="send-asset">
              {linkForThisNet ? (
                <input id="send-asset" className="input" readOnly value={token.symbol} />
              ) : (
                <TokenSelect id="send-asset" value={symbol} onChange={setSymbol} tokens={tokens} />
              )}
            </Field>
            <Field
              label="Amount"
              htmlFor="send-amount"
              hint={holdings.data ? `Available: ${fromBase(balance, token.decimals, 6)} ${token.symbol}` : 'Loading balance…'}
            >
              <div className="input-group">
                <input
                  id="send-amount"
                  className="input mono"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={fixedAmount ? fromBase(BigInt(fixedAmount), token.decimals).replace(/,/g, '') : amount}
                  readOnly={Boolean(fixedAmount)}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {fixedAmount ? null : (
                  <button type="button" className="input-group__btn" onClick={setMax}>
                    Max
                  </button>
                )}
              </div>
            </Field>
          </div>
          {linkWarning ? <Notice tone="warn" icon="eye">{linkWarning}</Notice> : null}
          {error ? <Notice tone="bad" icon="close">{error}</Notice> : null}
          {done ? (
            <Notice tone="good" icon="check">
              {done.text}. <ExplorerLink kind="tx" id={done.sig}>View transaction</ExplorerLink>
            </Notice>
          ) : null}
          <button type="submit" className="btn btn--dark" disabled={busy || (source === 'fresh' && !vault.unlocked)}>
            {busy ? <Spinner label="Sending" /> : <AppIcon name="send" />}
            {busy ? (source === 'main' ? 'Confirm in your wallet' : 'Sending') : 'Send'}
          </button>
          <p className="muted small-print">
            Gas is paid in ETH. Sending from a fresh address needs a little ETH at that address for gas.
          </p>
        </form>
      </Panel>
      {needsUnlock ? <UnlockCard why="Sending from a fresh address signs with its key, which is derived when you unlock." /> : null}
    </div>
  )
}

export function Send() {
  const { address } = useWallet()
  return (
    <div className="page">
      <PageHeader title="Send" text="Pay anyone from your wallet or from a fresh address that isn't linked to it." />
      <RequireWallet>{address ? <SendForm owner={address} /> : null}</RequireWallet>
    </div>
  )
}
