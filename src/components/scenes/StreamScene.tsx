import { useMemo } from 'react'
import { seeded, useCanvasLoop } from '@/hooks/useCanvasLoop'

const NOTES = 9
const SPACING = 128

type Bit = { x: number; y: number; s: number; rot: number; spin: number; hue: string; speed: number }

// A column of sealed notes rises behind the heading, each one carrying a locked amount.
export function StreamScene() {
  const bits = useMemo(() => {
    const rnd = seeded(23)
    const hues = ['rgba(175,155,245,0.55)', 'rgba(242,180,60,0.5)', 'rgba(160,215,245,0.55)']
    return Array.from({ length: 46 }, (): Bit => ({
      x: rnd(),
      y: rnd(),
      s: 4 + rnd() * 9,
      rot: rnd() * Math.PI,
      spin: (rnd() - 0.5) * 0.8,
      hue: hues[Math.floor(rnd() * hues.length)],
      speed: 0.006 + rnd() * 0.012,
    }))
  }, [])

  const ref = useCanvasLoop(({ ctx, w, h, t, px, py }) => {
    const small = w < 810
    const cx = w / 2 + px * 12
    // glow behind the column
    const g = ctx.createRadialGradient(cx, h * 0.62, 0, cx, h * 0.62, Math.max(w * 0.32, 320))
    g.addColorStop(0, 'rgba(214,202,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // loose confetti across the section
    for (const b of bits) {
      const y = (((b.y - t * b.speed) % 1) + 1) % 1
      const x = b.x * w + Math.sin(t * 0.5 + b.rot * 3) * 10 + px * 16
      ctx.save()
      ctx.translate(x, y * h + py * 10)
      ctx.rotate(b.rot + t * b.spin)
      ctx.globalAlpha = Math.min(1, y * 5, (1 - y) * 5)
      ctx.fillStyle = b.hue
      ctx.fillRect(-b.s / 2, -b.s * 0.2, b.s, b.s * 0.4)
      ctx.restore()
    }

    // the rising column
    const nw = small ? 120 : 168
    const nh = small ? 74 : 104
    const travel = NOTES * SPACING
    for (let i = 0; i < NOTES; i++) {
      const off = (((i * SPACING - t * 22) % travel) + travel) % travel
      const y = h + 60 - off
      const k = 1 - off / travel // 1 at bottom, 0 at top
      const sway = Math.sin(t * 0.6 + i * 1.7) * (small ? 12 : 26)
      const scale = 0.7 + k * 0.45
      const alpha = Math.min(1, k * 2.2, (1 - k) * 6) * 0.85
      if (alpha <= 0) continue
      ctx.save()
      ctx.translate(cx + sway, y)
      ctx.rotate(Math.sin(t * 0.5 + i) * 0.08)
      ctx.scale(scale, scale)
      ctx.globalAlpha = alpha
      // frosted note
      const ng = ctx.createLinearGradient(0, -nh / 2, 0, nh / 2)
      ng.addColorStop(0, 'rgba(255,255,255,0.92)')
      ng.addColorStop(1, 'rgba(236,231,255,0.8)')
      ctx.fillStyle = ng
      ctx.strokeStyle = 'rgba(165,145,240,0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(-nw / 2, -nh / 2, nw, nh, 12)
      ctx.fill()
      ctx.stroke()
      // sealed amount: a blurred bar
      ctx.fillStyle = 'rgba(120,100,200,0.22)'
      ctx.beginPath()
      ctx.roundRect(-nw / 2 + 14, -nh / 2 + 16, nw * 0.5, 10, 5)
      ctx.fill()
      ctx.fillStyle = 'rgba(120,100,200,0.12)'
      ctx.beginPath()
      ctx.roundRect(-nw / 2 + 14, -nh / 2 + 34, nw * 0.32, 8, 4)
      ctx.fill()
      // lock seal
      const lx = nw / 2 - 26
      const ly = nh / 2 - 26
      ctx.fillStyle = i % 3 === 0 ? 'rgba(242,180,60,0.95)' : 'rgba(150,128,235,0.9)'
      ctx.beginPath()
      ctx.roundRect(lx - 8, ly - 4, 16, 12, 3)
      ctx.fill()
      ctx.strokeStyle = ctx.fillStyle
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(lx, ly - 4, 5, Math.PI, 0)
      ctx.stroke()
      ctx.restore()
    }
  })

  return (
    <div className="scene">
      <canvas ref={ref} aria-hidden="true" />
    </div>
  )
}
