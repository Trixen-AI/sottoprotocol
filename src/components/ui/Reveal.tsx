import { motion, useReducedMotion } from 'motion/react'
import { Fragment, type ElementType, type ReactNode } from 'react'
import { EASE_OUT, WORD } from '@/lib/motion'

type RevealTextProps = {
  as?: ElementType
  className?: string
  /** One string per forced line. */
  lines: readonly string[] | string
  delay?: number
}

// Word-by-word entrance: each word rises 10px out of a 2px blur, staggered, once in view.
export function RevealText({ as: Tag = 'p', className, lines, delay = 0 }: RevealTextProps) {
  const reduce = useReducedMotion()
  const list = typeof lines === 'string' ? [lines] : lines
  let i = 0
  return (
    <Tag className={className}>
      {list.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(' ').map((w, wi) => {
            const index = i++
            return (
              <Fragment key={wi}>
                {wi > 0 && ' '}
                <motion.span
                  className="word"
                  initial={reduce ? false : WORD.hidden}
                  whileInView={WORD.shown}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: WORD.duration, ease: EASE_OUT, delay: delay + index * WORD.stagger }}
                >
                  {w}
                </motion.span>
              </Fragment>
            )
          })}
        </Fragment>
      ))}
    </Tag>
  )
}

// Block entrance used by card rows: fades up from 50px once in view.
export function Appear({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}
