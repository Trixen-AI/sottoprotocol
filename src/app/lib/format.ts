const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

export function usd(n: number | null | undefined) {
  return n == null || !Number.isFinite(n) ? '–' : usdFmt.format(n)
}

/** Integer base units -> decimal string, no float rounding. */
export function fromBase(raw: bigint, decimals: number, maxFraction = decimals) {
  const neg = raw < 0n
  const v = neg ? -raw : raw
  const base = 10n ** BigInt(decimals)
  const whole = v / base
  let frac = (v % base).toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '')
  if (frac === '' && v !== 0n && whole === 0n) frac = ''
  const s = `${whole.toLocaleString('en-US')}${frac ? `.${frac}` : ''}`
  return neg ? `-${s}` : s
}

/** Decimal string from user input -> integer base units. Throws on bad input. */
export function toBase(input: string, decimals: number): bigint {
  const s = input.trim().replace(/,/g, '')
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') throw new Error('Enter a valid amount')
  const [w, f = ''] = s.split('.')
  if (f.length > decimals) throw new Error(`Use at most ${decimals} decimal places`)
  return BigInt(w || '0') * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, '0') || '0')
}

export function toNumber(raw: bigint, decimals: number) {
  return Number(raw) / 10 ** decimals
}

export function short(addr: string, n = 4) {
  return addr.length <= n * 2 + 2 ? addr : `${addr.slice(0, n)}..${addr.slice(-n)}`
}

export function timeAgo(unixSeconds: number | null | undefined) {
  if (!unixSeconds) return 'pending'
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
  return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function dateTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function errorText(e: unknown) {
  const m = e instanceof Error ? e.message : String(e)
  if (/user rejected|rejected the request|declined/i.test(m)) return 'You cancelled the request in your wallet.'
  if (/insufficient (funds|lamports)|0x1\b/i.test(m)) return 'Not enough balance to cover the amount and network fee.'
  if (/403|forbidden/i.test(m)) return 'The RPC endpoint refused the request. Set a different RPC in Settings.'
  if (/429|too many requests/i.test(m)) return 'The RPC endpoint is rate limiting. Wait a moment or set your own RPC in Settings.'
  return m.length > 220 ? `${m.slice(0, 220)}…` : m
}
