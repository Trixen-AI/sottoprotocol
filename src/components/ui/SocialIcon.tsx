// Official platform marks, inlined unmodified from the files in src/assets/social.
// Source: x-logo.svg is the X logo path as served on https://x.com (official site)
import x from '@/assets/social/x-logo.svg?raw'

const files = { x } as const

export type SocialKey = keyof typeof files

export function SocialIcon({ name }: { name: SocialKey }) {
  return <span className="social-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: files[name] }} />
}
