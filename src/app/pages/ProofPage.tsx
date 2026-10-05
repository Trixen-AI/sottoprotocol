import { useMemo } from 'react'
import { useParams } from 'react-router'
import { PublicShell } from '../layout/PublicShell'
import { ProofResult } from '../components/ProofResult'
import { Notice } from '../components/ui'
import { decodeProof } from '../lib/proof'

export function ProofPage() {
  const { code = '' } = useParams()
  const parsed = useMemo(() => {
    try {
      return { proof: decodeProof(code), error: null }
    } catch (e) {
      return { proof: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [code])

  return (
    <PublicShell title="Payment proof" text="Checked live against the chain. No wallet needed.">
      {parsed.proof ? <ProofResult proof={parsed.proof} /> : <Notice tone="bad" icon="close">{parsed.error}</Notice>}
    </PublicShell>
  )
}
