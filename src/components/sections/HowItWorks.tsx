import { StreamScene } from '@/components/scenes/StreamScene'
import { RevealText } from '@/components/ui/Reveal'
import { how } from '@/data/content'
import { SiteLink } from '@/components/ui/SiteLink'

export function HowItWorks() {
  return (
    <section className="statement" id="how">
      <StreamScene />
      <div className="statement__top">
        <RevealText className="eyebrow" lines={how.eyebrow} />
        <RevealText as="h2" className="h2" lines={how.title} delay={0.1} />
        <div className="btn-row">
          <SiteLink className="btn btn--dark" href={how.primary.href}>
            {how.primary.label}
          </SiteLink>
          <SiteLink className="btn btn--accent" href={how.secondary.href}>
            {how.secondary.label}
          </SiteLink>
        </div>
      </div>
      <div className="glass">
        <RevealText as="h3" className="title-24" lines={how.cardTitle} />
        <div className="glass__cols">
          {how.steps.map((s) => (
            <p className="small" key={s.lead}>
              <b>{s.lead}</b> {s.text}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
