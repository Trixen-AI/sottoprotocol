import type { AnchorHTMLAttributes } from 'react'
import { Link } from 'react-router'

export const preloadApp = () => import('@/app/AppEntry')

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/** In-app routes use the router (and warm up the dashboard chunk on hover); everything else is a plain link. */
export function SiteLink({ href, children, ...rest }: Props) {
  const internal = href.startsWith('/') && !/\.[a-z0-9]+$/i.test(href)
  if (!internal) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href} onMouseEnter={preloadApp} onFocus={preloadApp} {...rest}>
      {children}
    </Link>
  )
}
