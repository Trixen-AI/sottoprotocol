import { useState, type FormEvent } from 'react'
import { Mark } from '@/components/brand/Logo'
import { OrbitScene, type OrbitItem } from '@/components/scenes/OrbitScene'
import { RevealText } from '@/components/ui/Reveal'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { closing, footer, socials } from '@/data/content'
import { SiteLink } from '@/components/ui/SiteLink'

const ITEMS: OrbitItem[] = [
  { kind: 'token', label: 'SOL' },
  { kind: 'lock' },
  { kind: 'token', label: 'USDC' },
  { kind: 'dot' },
  { kind: 'token', label: 'ZEC' },
  { kind: 'lock' },
  { kind: 'token', label: 'sealed' },
  { kind: 'dot' },
]

export function Closing() {
  const [status, setStatus] = useState('')
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (!data.get('consent')) {
      setStatus('Tick the box so we know you want launch notes.')
      return
    }
    setStatus('Thanks. Signup is not connected yet, so nothing was sent.')
  }

  return (
    <div className="closing">
      <section className="cta" id="start">
        <OrbitScene
          seed={61}
          glows={[
            { x: 0.5, y: 0.5, r: 0.36, color: 'rgba(205,190,255,0.5)' },
            { x: 0.2, y: 0.8, r: 0.2, color: 'rgba(255,221,150,0.4)' },
            { x: 0.85, y: 0.3, r: 0.22, color: 'rgba(196,232,255,0.5)' },
          ]}
          items={ITEMS}
          radius={0.44}
          squash={0.3}
          speed={0.05}
          stageClass="orbit--closing"
          center={
            <div className="seal" aria-hidden="true">
              <Mark size={84} />
            </div>
          }
        />
        <div className="cta__content">
          <RevealText className="eyebrow" lines={closing.eyebrow} />
          <RevealText as="h2" className="display" lines={closing.title} delay={0.1} />
          <RevealText className="cta__p" lines={closing.body} delay={0.2} />
          <div className="btn-row">
            <SiteLink className="btn btn--dark" href={closing.primary.href}>
              {closing.primary.label}
            </SiteLink>
            <SiteLink className="btn btn--light" href={closing.secondary.href}>
              {closing.secondary.label}
            </SiteLink>
          </div>
        </div>
      </section>

      <footer className="footer" id="faq">
        <div className="footer__card">
          <div className="footer__top">
            <div>
              <Mark className="footer__mark" size={30} />
              <h2 className="footer__title">
                {footer.title[0]}
                <br />
                {footer.title[1]}
              </h2>
              <div className="socials">
                {socials.map((s) => (
                  <SiteLink key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <SocialIcon name={s.key} />
                  </SiteLink>
                ))}
              </div>
              <p className="footer__news">
                {footer.news[0]}
                <br />
                {footer.news[1]}
              </p>
              <form className="footer__signup" onSubmit={onSubmit} noValidate>
                <label className="footer__label" htmlFor="email">
                  Email
                </label>
                <div className="footer__form">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="footer__input"
                    placeholder="Enter your email *"
                  />
                  <button type="submit" className="footer__submit">
                    {footer.submit}
                  </button>
                  <label className="consent">
                    <input type="checkbox" name="consent" />
                    {footer.consent}
                  </label>
                </div>
                <p className="footer__status" role="status">
                  {status}
                </p>
              </form>
            </div>

            <nav className="footer__links" aria-label="Footer">
              {footer.links.map((col, i) => (
                <ul key={i}>
                  {col.map((l) => (
                    <li key={l.label}>
                      <SiteLink href={l.href}>{l.label}</SiteLink>
                    </li>
                  ))}
                </ul>
              ))}
            </nav>
          </div>

          <div className="footer__bottom">
            <p className="footer__fine">{footer.fine}</p>
            <div className="footer__legal">
              {footer.legal.map((l) => (
                <SiteLink key={l.label} href={l.href}>
                  {l.label}
                </SiteLink>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
