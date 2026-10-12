import { useId } from 'react'
import { LOGO_WIDTH, MARK, WORD_PATH } from './logoPaths'

const GOLD = '#F2B43C'
const SLITS = Array.from({ length: MARK.count }, (_, k) => (360 / MARK.count) * k)

/** The coin with three wind currents cut through it, around a sealed core. Disc uses currentColor. */
function MarkShape({ core = GOLD }: { core?: string }) {
  // the currents are real cut-outs, so each instance needs its own mask id
  const id = `zm-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  return (
    <>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          {SLITS.map((deg) => (
            <path
              key={deg}
              d={MARK.slit}
              transform={`rotate(${deg} 16 16)`}
              fill="none"
              stroke="#000"
              strokeWidth={MARK.slitWidth}
              strokeLinecap="round"
            />
          ))}
          <circle cx="16" cy="16" r={MARK.coreGap} fill="#000" />
        </mask>
      </defs>
      <circle cx="16" cy="16" r={MARK.disc} fill="currentColor" mask={`url(#${id})`} />
      <circle cx="16" cy="16" r={MARK.core} fill={core} />
    </>
  )
}

export function Logo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${LOGO_WIDTH} 32`}
      height={height}
      width={(LOGO_WIDTH / 32) * height}
      fill="currentColor"
      role="img"
      aria-label="Zephyra OS"
    >
      <MarkShape />
      <path d={WORD_PATH} />
    </svg>
  )
}

export function Mark({ className, size = 32, core }: { className?: string; size?: number; core?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <MarkShape core={core} />
    </svg>
  )
}
