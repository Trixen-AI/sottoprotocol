import { useMemo } from 'react'
import { seeded, useCanvasLoop, type Frame } from '@/hooks/useCanvasLoop'

export type Glow = { x: number; y: number; r: number; color: string; drift?: number }

type Tile = { x: number; y: number; s: number; rot: number; depth: number; speed: number; phase: number }

type Props = {
  seed: number
  glows: Glow[]
  tiles?: number
  /** horizontal band (0..1) where tiles float */
  band?: [number, number]
  /** extra drawing on top of the atmosphere, in the same frame */
  overlay?: (f: Frame) => void
}

// Soft drifting colour fields with a scatter of frosted tiles: Sotto's shared scene backdrop.
export function Atmosphere({ seed, glows, tiles = 12, band = [0, 1], overlay }: Props) {
  const field = useMemo(() => {
    const rnd = seeded(seed)
    return Array.from({ length: tiles }, (): Tile => ({
      x: band[0] + rnd() * (band[1] - band[0]),
      y: rnd(),
      s: 10 + rnd() * 26,
      rot: (rnd() - 0.5) * 0.9,
      depth: 0.3 + rnd() * 0.7,
      speed: 0.004 + rnd() * 0.01,
      phase: rnd() * Math.PI * 2,
    }))
  }, [seed, tiles, band])

  const ref = useCanvasLoop((f) => {
    const { ctx, w, h, t, px, py } = f
    for (const g of glows) {
      const d = g.drift ?? 0.02
      const cx = (g.x + Math.sin(t * 0.13 + g.r) * d) * w + px * 14
      const cy = (g.y + Math.cos(t * 0.11 + g.x * 9) * d) * h + py * 10
      const r = g.r * Math.max(w, h * 1.4)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      grad.addColorStop(0, g.color)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }
    for (const p of field) {
      const y = (((p.y - t * p.speed) % 1) + 1) % 1
      const x = p.x * w + Math.sin(t * 0.4 + p.phase) * 12 + px * 30 * p.depth
      const yy = y * (h + 80) - 40 + py * 20 * p.depth
      const fade = Math.min(1, y * 6, (1 - y) * 6)
      const s = p.s * (0.6 + p.depth * 0.6)
      ctx.save()
      ctx.translate(x, yy)
      ctx.rotate(p.rot + Math.sin(t * 0.3 + p.phase) * 0.15)
      ctx.globalAlpha = 0.55 * fade * p.depth
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.strokeStyle = 'rgba(160,140,235,0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(-s * 0.8, -s / 2, s * 1.6, s, s * 0.18)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    overlay?.(f)
  })

  return <canvas ref={ref} aria-hidden="true" />
}
