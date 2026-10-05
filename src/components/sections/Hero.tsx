import { HeroScene } from '@/components/scenes/HeroScene'
import { RevealText } from '@/components/ui/Reveal'
import { hero } from '@/data/content'
import { SiteLink } from '@/components/ui/SiteLink'

export function Hero() {
  return (
    <section className="hero" id="top">
      <HeroScene />
      <div className="hero__content">
        <RevealText className="eyebrow fit" lines={hero.eyebrow} />
        <RevealText as="h1" className="display fit" lines={hero.title} delay={0.1} />
        <RevealText className="lead fit" lines={hero.body} delay={0.25} />
        <div className="btn-row fit">
          <SiteLink className="btn btn--dark" href={hero.primary.href}>
            {hero.primary.label}
          </SiteLink>
          <SiteLink className="btn btn--accent" href={hero.secondary.href}>
            {hero.secondary.label}
          </SiteLink>
        </div>
      </div>
    </section>
  )
}
