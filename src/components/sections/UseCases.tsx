import { Icon } from '@/components/ui/Icon'
import { Appear, RevealText } from '@/components/ui/Reveal'
import { uses, usesActions } from '@/data/content'
import { SiteLink } from '@/components/ui/SiteLink'

const tone = { ink: 'card card--ink', gold: 'card card--gold', violet: 'card card--violet', plain: 'card' } as const

export function UseCases() {
  const rows = [uses.slice(0, 2), uses.slice(2, 4)]
  return (
    <section className="uses" id="use-cases" aria-label="What you can do with private money">
      <div className="bento__rows">
        {rows.map((row, ri) => (
          <Appear className="grid2" key={ri}>
            {row.map((u) => (
              <article className={tone[u.tone]} key={u.title}>
                <div className="card__head">
                  <RevealText as="h3" className="title-24" lines={u.title} />
                  <Icon name={u.icon} className="card__icon" />
                </div>
                <p className="small">{u.text}</p>
              </article>
            ))}
          </Appear>
        ))}
      </div>
      <div className="btn-row">
        <SiteLink className="btn btn--dark" href={usesActions.primary.href}>
          {usesActions.primary.label}
        </SiteLink>
        <SiteLink className="btn btn--ghost" href={usesActions.secondary.href}>
          {usesActions.secondary.label}
        </SiteLink>
      </div>
    </section>
  )
}
