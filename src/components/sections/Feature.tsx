import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import { RevealText } from '@/components/ui/Reveal'
import type { IconName } from '@/data/content'
import { SiteLink } from '@/components/ui/SiteLink'

type Props = {
  id?: string
  icon: IconName
  title: string
  body: string
  cta: { label: string; href: string }
  scene: ReactNode
  fade: 'top' | 'bottom'
}

export function Feature({ id, icon, title, body, cta, scene, fade }: Props) {
  return (
    <section className={`feature feature--fade-${fade}`} id={id}>
      {scene}
      <div className="feature__content">
        <Icon name={icon} className="feature__icon fit" strokeWidth={1.2} />
        <RevealText as="h2" className="h2 fit" lines={title} />
        <RevealText className="lead fit" lines={body} delay={0.1} />
        <SiteLink className="btn btn--dark" href={cta.href}>
          {cta.label}
        </SiteLink>
      </div>
    </section>
  )
}
