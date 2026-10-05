import { useEffect, useState } from 'react'

/** Current time that re-renders every `ms`, for deadlines and countdowns. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

/** Timestamp for records created inside event handlers. */
export const stamp = () => Date.now()
