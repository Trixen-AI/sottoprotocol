import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'

/** Standalone pages people reach from a shared link: payment requests and proofs. */
export function PublicShell({ title, text, right, children }: { title: string; text?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="public">
      <header className="public__bar">
        <Link to="/" aria-label="Sotto website">
          <Logo height={28} />
        </Link>
        {right}
      </header>
      <main className="public__main">
        <div className="public__card">
          <h1 className="public__title">{title}</h1>
          {text ? <p className="public__text">{text}</p> : null}
          {children}
        </div>
        <p className="public__foot">
          Sotto never holds funds or keys. Payments go straight from your wallet to the recipient on Solana.
        </p>
      </main>
    </div>
  )
}
