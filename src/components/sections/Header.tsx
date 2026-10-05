import { useEffect, useState } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Chevron } from '@/components/ui/Icon'
import { hero, nav } from '@/data/content'
import { SiteLink } from '@/components/ui/SiteLink'

export function Header() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const mq = window.matchMedia('(min-width: 1200px)')
    mq.addEventListener('change', close)
    window.addEventListener('keydown', onKey)
    return () => {
      mq.removeEventListener('change', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <header className="header">
        <div className="header__inner">
          <SiteLink href="#top" className="header__logo" aria-label="Sotto home">
            <Logo />
          </SiteLink>

          <div className="header__right">
            <nav className="nav" aria-label="Main">
              {nav.map((item) => (
                <div className="nav__item" key={item.label}>
                  <button type="button" className="nav__trigger" aria-haspopup="true">
                    {item.label}
                    <Chevron className="nav__chev" />
                  </button>
                  <div className="nav__panel">
                    <p className="title-24">{item.title}</p>
                    <div className="nav__panel-row">
                      <p>{item.text}</p>
                      <SiteLink className="btn btn--dark btn--sm" href={item.href}>
                        {item.cta}
                      </SiteLink>
                    </div>
                  </div>
                </div>
              ))}
            </nav>

            <div className="header__actions">
              <SiteLink className="btn btn--dark btn--sm" href={hero.primary.href}>
                {hero.primary.label}
              </SiteLink>
            </div>

            <button
              type="button"
              className="burger"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => {
                setSection(null)
                setOpen((v) => !v)
              }}
            >
              <span />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="mobile-menu" id="mobile-menu">
          {nav.map((item, i) => {
            const expanded = section === item.label
            const id = `mobile-menu-panel-${i}`
            return (
              <div className="mobile-menu__item" key={item.label}>
                <button
                  type="button"
                  className="mobile-menu__trigger"
                  aria-expanded={expanded}
                  aria-controls={id}
                  onClick={() => setSection(expanded ? null : item.label)}
                >
                  {item.label}
                  <Chevron className="nav__chev" />
                </button>
                <div className="mobile-menu__panel" id={id} hidden={!expanded}>
                  <p className="mobile-menu__title">{item.title}</p>
                  <p className="mobile-menu__text">{item.text}</p>
                  <SiteLink className="btn btn--dark btn--sm" href={item.href} onClick={() => setOpen(false)}>
                    {item.cta}
                  </SiteLink>
                </div>
              </div>
            )
          })}
          <SiteLink className="btn btn--dark mobile-menu__cta" href={hero.primary.href} onClick={() => setOpen(false)}>
            {hero.primary.label}
          </SiteLink>
        </div>
      )}
    </>
  )
}
