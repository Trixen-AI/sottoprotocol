import { useEffect, useState, type ReactNode } from 'react'
import QRCodeLib from 'qrcode'
import { explorerUrl } from '../config'
import { fromBase, short, usd } from '../lib/format'
import { priceOf, type Prices } from '../lib/prices'
import type { Token } from '../lib/tokens'
import { useSolana } from '../state/solana'
import { AppIcon, type AppIconName } from './AppIcon'

export function PageHeader({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-head__title">{title}</h1>
        {text ? <p className="page-head__text">{text}</p> : null}
      </div>
      {children ? <div className="page-head__actions">{children}</div> : null}
    </header>
  )
}

export function Panel({ title, action, children, tone, className = '' }: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  tone?: 'ink' | 'gold' | 'violet'
  className?: string
}) {
  return (
    <section className={`panel ${tone ? `panel--${tone}` : ''} ${className}`}>
      {title || action ? (
        <div className="panel__head">
          {title ? <h2 className="panel__title">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function CopyButton({ value, label = 'Copy', compact = false }: { value: string; label?: string; compact?: boolean }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => setDone(false), 1400)
    return () => window.clearTimeout(t)
  }, [done])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
    } catch {
      window.prompt('Copy this:', value)
    }
  }
  return (
    <button type="button" className={compact ? 'icon-btn' : 'btn btn--line btn--sm'} onClick={copy} aria-label={compact ? `${label}: ${value}` : undefined}>
      <AppIcon name={done ? 'check' : 'copy'} />
      {compact ? null : done ? 'Copied' : label}
    </button>
  )
}

export function ExplorerLink({ kind, id, children }: { kind: 'tx' | 'account'; id: string; children?: ReactNode }) {
  const { network } = useSolana()
  return (
    <a className="ext-link" href={explorerUrl(network, kind, id)} target="_blank" rel="noopener noreferrer">
      {children ?? short(id, 6)}
      <AppIcon name="external" />
    </a>
  )
}

export function Address({ value, label, chars = 4 }: { value: string; label?: string; chars?: number }) {
  return (
    <span className="addr">
      {label ? <span className="addr__label">{label}</span> : null}
      <span className="addr__value mono" title={value}>
        {short(value, chars)}
      </span>
      <CopyButton value={value} label="Copy address" compact />
      <ExplorerLink kind="account" id={value}>
        <span className="sr-only">View on explorer</span>
      </ExplorerLink>
    </span>
  )
}

export function QRCode({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>('')
  useEffect(() => {
    let alive = true
    QRCodeLib.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#14121c', light: '#ffffff' }, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''))
    return () => {
      alive = false
    }
  }, [value, size])
  return (
    <div className="qr" style={{ width: size, height: size }}>
      {src ? <img src={src} width={size} height={size} alt="QR code" /> : null}
    </div>
  )
}

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent'

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill pill--${tone}`}>{children}</span>
}

export function Notice({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: AppIconName; children: ReactNode }) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {icon ? <AppIcon name={icon} /> : null}
      <div>{children}</div>
    </div>
  )
}

export function Empty({ icon, title, children, action }: { icon: AppIconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <AppIcon name={icon} />
      </span>
      <p className="empty__title">{title}</p>
      {children ? <p className="empty__text">{children}</p> : null}
      {action}
    </div>
  )
}

export function Field({ label, hint, error, htmlFor, children }: {
  label: string
  hint?: ReactNode
  error?: string | null
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          className={value === o.value ? 'is-active' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Amount({ raw, token, prices, showUsd = true }: { raw: bigint; token: Token; prices?: Prices; showUsd?: boolean }) {
  const p = priceOf(prices, token)
  const value = Number(raw) / 10 ** token.decimals
  return (
    <span className="amount">
      <span className="amount__value">
        {fromBase(raw, token.decimals, Math.min(token.decimals, 6))} {token.symbol}
      </span>
      {showUsd && p !== undefined ? <span className="amount__usd">{usd(value * p)}</span> : null}
    </span>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="spinner" role="status">
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} style={{ width: `${90 - i * 14}%` }} />
      ))}
    </div>
  )
}
