import { Icon } from '@/components/ui/Icon'
import { Appear } from '@/components/ui/Reveal'
import { explorer } from '@/data/content'

export function Explorer() {
  const rows = [explorer.slice(0, 2), explorer.slice(2, 4)]
  return (
    <section className="bento" aria-label="What an explorer shows">
      <div className="bento__rows">
        {rows.map((row, ri) => (
          <Appear className="grid2" key={ri}>
            {row.map((c) => (
              <article className="card" key={c.icon}>
                <Icon name={c.icon} className="bento__icon" strokeWidth={1.2} />
                <p className="lead">{c.text}</p>
              </article>
            ))}
          </Appear>
        ))}
      </div>
    </section>
  )
}
