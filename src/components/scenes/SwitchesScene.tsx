import { useEffect, useRef, useState } from 'react'
import { people } from '@/data/content'
import { Atmosphere, type Glow } from './Atmosphere'

const GLOWS: Glow[] = [
  { x: 0.7, y: 0.45, r: 0.32, color: 'rgba(205,190,255,0.55)' },
  { x: 0.92, y: 0.75, r: 0.2, color: 'rgba(255,221,150,0.45)' },
  { x: 0.55, y: 0.15, r: 0.2, color: 'rgba(196,232,255,0.5)' },
]

const STEP_MS = 650
const HOLD_STEPS = 6

// The privacy panel: every switch comes on, one after another, as the first deposit lands.
export function SwitchesScene() {
  const total = people.switches.length
  const [on, setOn] = useState(total)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let step = 0
    let timer = 0
    const run = () => {
      timer = window.setInterval(() => {
        step = (step + 1) % (total + HOLD_STEPS + 1)
        setOn(Math.min(step, total))
      }, STEP_MS)
    }
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(timer)
      if (e.isIntersecting) run()
    })
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearInterval(timer)
    }
  }, [total])

  return (
    <div className="scene">
      <Atmosphere seed={37} glows={GLOWS} tiles={10} band={[0.5, 1]} />
      <div className="switches-anchor" ref={ref} aria-hidden="true">
        <div className="switches">
          <div className="switches__head">
            <span>privacy</span>
            <span>
              {on}/{total} on
            </span>
          </div>
          <ul>
            {people.switches.map((label, i) => (
              <li key={label} className={i < on ? 'is-on' : undefined}>
                <span>{label}</span>
                <span className="switch" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>
        <div className="proof-chip">
          <span className="proof-chip__dot" />
          proof of origin · shared with 1 party
        </div>
      </div>
    </div>
  )
}
