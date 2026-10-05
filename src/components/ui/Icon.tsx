import type { IconName } from '@/data/content'

// Sotto's own line icons: 24 grid, 1.5 stroke, round joins.
const paths: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
      <path d="M8 10.5h5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 12c2.2-4 5.3-6 9-6s6.8 2 9 6c-2.2 4-5.3 6-9 6s-6.8-2-9-6Z" />
      <path d="M4 20 20 4" />
      <path d="M9.6 9.8a3 3 0 0 0 4.4 4.1" />
    </>
  ),
  list: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 8.5h8M8 12h8M8 15.5h4.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="m11.3 11.7 8.2-8.2M16.5 6.5l2.5 2.5M14 9l2 2" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L11.8 6.5" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  send: (
    <>
      <path d="M4 12 20 4l-5 16-3.5-6.5Z" />
      <path d="m11.5 13.5 3.5-3.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <rect x="4" y="8" width="16" height="11" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.2" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M8 20h8M5 7h14" />
      <path d="m5 7-2.5 6a2.5 2.5 0 0 0 5 0Zm14 0-2.5 6a2.5 2.5 0 0 0 5 0Z" />
    </>
  ),
  toggle: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="5" />
      <circle cx="16.5" cy="12" r="3" />
    </>
  ),
  code: (
    <>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5.5l-3 13" />
    </>
  ),
  pulse: (
    <>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </>
  ),
  trend: (
    <>
      <path d="m4 16 5-5 3.5 3.5L20 7" />
      <path d="M15 7h5v5" />
    </>
  ),
}

type Props = { name: IconName; className?: string; strokeWidth?: number }

export function Icon({ name, className, strokeWidth = 1.5 }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="m2.5 5 4.5 4.5L11.5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
