import { useEffect } from 'react'
import { useLocation } from 'react-router'

const TITLES: [RegExp, string][] = [
  [/^\/app\/?$/, 'Overview'],
  [/^\/app\/receive\/.+/, 'Pay link'],
  [/^\/app\/receive/, 'Pay links'],
  [/^\/app\/send/, 'Send'],
  [/^\/app\/shield/, 'The Shield'],
  [/^\/app\/addresses/, 'Fresh addresses'],
  [/^\/app\/proofs/, 'Proofs'],
  [/^\/app\/exposure/, 'Exposure'],
  [/^\/app\/settings/, 'Settings'],
  [/^\/pay\//, 'Payment request'],
  [/^\/proof\//, 'Payment proof'],
]

/** Per-page titles, and keeps the dashboard, pay links and proofs out of search results. */
export function RouteMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const prev = { title: document.title, robots: robots?.content, canonical: canonical?.getAttribute('href') }
    robots?.setAttribute('content', 'noindex, nofollow')
    canonical?.remove()
    return () => {
      document.title = prev.title
      if (robots && prev.robots) robots.setAttribute('content', prev.robots)
      if (canonical && prev.canonical) document.head.appendChild(canonical)
    }
  }, [])

  useEffect(() => {
    const name = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Page not found'
    document.title = `${name} | Sotto`
  }, [pathname])

  return null
}
