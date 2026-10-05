import { useEffect, useRef } from 'react'
import { Mark } from '@/components/brand/Logo'
import type { Frame } from '@/hooks/useCanvasLoop'
import { hero } from '@/data/content'
import { Atmosphere, type Glow } from './Atmosphere'

const GLOWS: Glow[] = [
  { x: 0.74, y: 0.45, r: 0.34, color: 'rgba(205,190,255,0.55)' },
  { x: 0.9, y: 0.2, r: 0.22, color: 'rgba(196,232,255,0.55)' },
  { x: 0.62, y: 0.78, r: 0.2, color: 'rgba(255,221,150,0.45)' },
  { x: 0.15, y: 0.15, r: 0.25, color: 'rgba(236,230,255,0.6)' },
]

const SHARDS = 6

// Key shards orbit the wallet on a tilted ring, drawn behind the card.
function drawRing(f: Frame, anchor: { x: number; y: number; s: number }) {
  const { ctx, t, px, py } = f
  const cx = anchor.x + px * 10
  const cy = anchor.y + py * 8
  const rx = 250 * anchor.s
  const ry = 82 * anchor.s
  const tilt = -0.2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tilt)
  ctx.strokeStyle = 'rgba(160,140,235,0.35)'
  ctx.setLineDash([2, 7])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  for (let i = 0; i < SHARDS; i++) {
    const a = t * 0.32 + (i / SHARDS) * Math.PI * 2
    const x = Math.cos(a) * rx
    const y = Math.sin(a) * ry
    const depth = (Math.sin(a) + 1) / 2 // 0 back, 1 front
    const size = (16 + depth * 14) * anchor.s
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a + Math.PI / 2 + Math.sin(t + i) * 0.2)
    const g = ctx.createLinearGradient(-size, -size, size, size)
    g.addColorStop(0, `rgba(255,214,120,${0.55 + depth * 0.45})`)
    g.addColorStop(1, `rgba(226,150,40,${0.45 + depth * 0.45})`)
    ctx.fillStyle = g
    // a shard: one tooth of a key, rounded
    ctx.beginPath()
    ctx.moveTo(-size * 0.55, -size * 0.35)
    ctx.quadraticCurveTo(0, -size * 0.75, size * 0.55, -size * 0.35)
    ctx.lineTo(size * 0.3, size * 0.45)
    ctx.quadraticCurveTo(0, size * 0.2, -size * 0.3, size * 0.45)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

export function HeroScene() {
  const anchorRef = useRef<HTMLDivElement>(null)
  const anchor = useRef({ x: 0, y: 0, s: 1 })

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const measure = () => {
      const parent = el.offsetParent as HTMLElement | null
      if (!parent) return
      const r = el.getBoundingClientRect()
      const p = parent.getBoundingClientRect()
      anchor.current = {
        x: r.left - p.left + r.width / 2,
        y: r.top - p.top + r.height / 2,
        s: r.width / 340,
      }
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(document.documentElement)
    measure()
    return () => ro.disconnect()
  }, [])

  const w = hero.wallet
  return (
    <div className="scene">
      <Atmosphere seed={11} glows={GLOWS} tiles={14} band={[0.45, 1]} overlay={(f) => drawRing(f, anchor.current)} />
      {/* static anchor: measured for the ring; only its child moves */}
      <div className="wallet-anchor" ref={anchorRef}>
        <div className="wallet" tabIndex={0} aria-label="Example private wallet. Hover or focus to view the balance.">
          <div className="wallet__top">
            <span>{w.tag}</span>
            <Mark size={20} />
          </div>
          <p className="wallet__addr">{w.address}</p>
          <p className="wallet__bal">
            <span className="wallet__amt">{w.balance}</span>
          </p>
          <div className="wallet__foot">
            <span>{w.sub}</span>
            <span className="wallet__hint">
              <span className="wallet__hint--mouse">{w.hint}</span>
              <span className="wallet__hint--touch">{w.hintTouch}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
