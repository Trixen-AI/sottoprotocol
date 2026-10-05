import { useEffect, useRef, type ReactNode } from 'react'
import { Atmosphere, type Glow } from './Atmosphere'

export type OrbitItem = { kind: 'token' | 'lock' | 'dot'; label?: string }

type Props = {
  seed: number
  glows: Glow[]
  items: OrbitItem[]
  /** ring radius as a fraction of the stage width, and its squash */
  radius: number
  squash: number
  speed?: number
  /** className that positions the stage (centre point) per breakpoint */
  stageClass: string
  center: ReactNode
}

// Chips travel a tilted ring around a centre object, passing in front of and behind it.
export function OrbitScene({ seed, glows, items, radius, squash, speed = 0.12, stageClass, center }: Props) {
  const stage = useRef<HTMLDivElement>(null)
  const chips = useRef<(HTMLSpanElement | null)[]>([])
  const ring = useRef<SVGEllipseElement>(null)

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let t = 0
    let last = 0
    let rx = 0
    let ry = 0
    const measure = () => {
      const w = el.getBoundingClientRect().width
      rx = w * radius
      ry = rx * squash
      if (ring.current) {
        ring.current.setAttribute('rx', String(rx))
        ring.current.setAttribute('ry', String(ry))
      }
      place()
    }
    const place = () => {
      const n = items.length
      chips.current.forEach((chip, i) => {
        if (!chip) return
        const a = t * speed * Math.PI * 2 + (i / n) * Math.PI * 2
        const x = Math.cos(a) * rx
        const y = Math.sin(a) * ry
        const depth = (Math.sin(a) + 1) / 2
        const s = 0.72 + depth * 0.38
        chip.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`
        chip.style.opacity = (0.45 + depth * 0.55).toFixed(2)
        chip.style.zIndex = depth > 0.5 ? '6' : '2'
      })
    }
    const tick = (now: number) => {
      if (last) t += Math.min((now - last) / 1000, 0.05)
      last = now
      place()
      raf = requestAnimationFrame(tick)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf)
      raf = 0
      if (e.isIntersecting && !reduce) {
        last = 0
        raf = requestAnimationFrame(tick)
      }
    })
    io.observe(el)
    t = 1.3
    measure()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [items, radius, squash, speed])

  return (
    <div className="scene">
      <Atmosphere seed={seed} glows={glows} tiles={8} />
      <div className={`orbit ${stageClass}`} ref={stage}>
        <svg className="orbit__ring" aria-hidden="true">
          <ellipse ref={ring} cx="50%" cy="50%" rx="0" ry="0" />
        </svg>
        <div className="orbit__center">{center}</div>
        {items.map((it, i) => (
          <span
            key={i}
            ref={(n) => {
              chips.current[i] = n
            }}
            className={`orbit__chip orbit__chip--${it.kind}`}
            aria-hidden="true"
          >
            {it.kind === 'token' && it.label}
            {it.kind === 'lock' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
              </svg>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
