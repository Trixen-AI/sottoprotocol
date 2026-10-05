export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const WORD = {
  hidden: { opacity: 0.001, y: 10, filter: 'blur(2px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)' },
  duration: 0.6,
  stagger: 0.035,
}
