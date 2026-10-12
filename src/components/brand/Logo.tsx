import { LOGO_WIDTH, MARK_PATH, MARK_STROKE, WORD_PATH } from './logoPaths'

function MarkPath() {
  return <path d={MARK_PATH} fill="none" stroke="currentColor" strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
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
      <MarkPath />
      <path d={WORD_PATH} />
    </svg>
  )
}

export function Mark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg className={className} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <MarkPath />
    </svg>
  )
}
