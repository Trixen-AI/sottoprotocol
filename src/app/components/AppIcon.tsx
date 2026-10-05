// Dashboard icons in the website's line style: 24 grid, 1.5 stroke, round joins.
const paths = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
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
  shield: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6Z" />
      <path d="M8.5 12.5h7" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="m11.3 11.7 8.2-8.2M16.5 6.5l2.5 2.5M14 9l2 2" />
    </>
  ),
  proof: (
    <>
      <path d="M6 3.5h8l4 4v13H6Z" />
      <path d="M14 3.5v4h4" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  eye: (
    <>
      <path d="M3 12c2.2-4 5.3-6 9-6s6.8 2 9 6c-2.2 4-5.3 6-9 6s-6.8-2-9-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M17 13.5v4a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrowIn: (
    <>
      <path d="M12 4v13" />
      <path d="m6.5 11.5 5.5 5.5 5.5-5.5" />
      <path d="M5 20h14" />
    </>
  ),
  arrowOut: (
    <>
      <path d="M12 17V4" />
      <path d="m6.5 9.5 5.5-5.5 5.5 5.5" />
      <path d="M5 20h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5V9H15" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.6-1.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <rect x="4" y="8" width="16" height="11" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.2" />
    </>
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  back: <path d="m14.5 6-6 6 6 6" />,
  swap: (
    <>
      <path d="M5 8h13l-3.5-3.5" />
      <path d="M19 16H6l3.5 3.5" />
    </>
  ),
} as const

export type AppIconName = keyof typeof paths

export function AppIcon({ name, className = 'ico' }: { name: AppIconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
