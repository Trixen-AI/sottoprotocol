import { Link } from 'react-router'
import { PublicShell } from '../layout/PublicShell'
import { Empty } from '../components/ui'

export function NotFound({ inDashboard = false }: { inDashboard?: boolean }) {
  const body = (
    <Empty icon="close" title="Nothing here" action={<Link className="btn btn--dark" to={inDashboard ? '/app' : '/'}>{inDashboard ? 'Back to overview' : 'Back to Sotto'}</Link>}>
      This page does not exist.
    </Empty>
  )
  return inDashboard ? <div className="page">{body}</div> : <PublicShell title="Page not found">{body}</PublicShell>
}
