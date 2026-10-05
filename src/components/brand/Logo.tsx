import { LOGO_WIDTH, MARK_PATH, WORD_PATH } from './logoPaths'

export function Logo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${LOGO_WIDTH} 32`}
      height={height}
      width={(LOGO_WIDTH / 32) * height}
      fill="currentColor"
      role="img"
      aria-label="Sotto"
    >
      <path fillRule="evenodd" d={MARK_PATH} />
      <path d={WORD_PATH} />
    </svg>
  )
}

export function Mark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg className={className} viewBox="0 0 32 32" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d={MARK_PATH} />
    </svg>
  )
}
