import { useEffect, useLayoutEffect, useRef } from 'react'

export type Frame = {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  /** seconds since start */
  t: number
  /** pointer offset from centre, -1..1, eased */
  px: number
  py: number
}

// Runs draw() on a DPR-sharp canvas that fills its parent.
// Pauses while offscreen; draws a single still frame under prefers-reduced-motion.
export function useCanvasLoop(draw: (f: Frame) => void) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  useLayoutEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let raf = 0
    let visible = false
    let elapsed = 0
    let last = 0
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduce || !visible) render()
    }
    const render = () => {
      ctx.clearRect(0, 0, w, h)
      drawRef.current({ ctx, w, h, t: elapsed, px: ptr.x, py: ptr.y })
    }
    const tick = (now: number) => {
      if (last) elapsed += Math.min((now - last) / 1000, 0.05)
      last = now
      ptr.x += (ptr.tx - ptr.x) * 0.04
      ptr.y += (ptr.ty - ptr.y) * 0.04
      render()
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (reduce || raf) return
      last = 0
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onMove = (e: PointerEvent) => {
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(canvas)
    window.addEventListener('pointermove', onMove, { passive: true })
    resize()
    if (reduce) {
      elapsed = 4
      render()
    }
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return ref
}

// Deterministic pseudo-random so every load draws the same scene.
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
