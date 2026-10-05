import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

// A small fetch cache: one request per key at a time, shared by every component that asks for it,
// optional polling while the tab is visible, and invalidation by key prefix after a transaction.
type Entry = {
  data?: unknown
  error?: unknown
  loading: boolean
  updatedAt?: number
  promise?: Promise<void>
  subs: Set<() => void>
  snapshot: Snapshot<unknown>
}

export type Snapshot<T> = { data?: T; error?: unknown; loading: boolean; updatedAt?: number }

const entries = new Map<string, Entry>()
const IDLE: Snapshot<never> = { loading: false }

function entry(key: string) {
  let e = entries.get(key)
  if (!e) {
    e = { loading: false, subs: new Set(), snapshot: { loading: false } }
    entries.set(key, e)
  }
  return e
}

function publish(e: Entry) {
  e.snapshot = { data: e.data, error: e.error, loading: e.loading, updatedAt: e.updatedAt }
  e.subs.forEach((s) => s())
}

function run(key: string, fetcher: () => Promise<unknown>) {
  const e = entry(key)
  if (e.promise) return e.promise
  e.loading = true
  publish(e)
  e.promise = fetcher()
    .then(
      (data) => {
        e.data = data
        e.error = undefined
        e.updatedAt = Date.now()
      },
      (err) => {
        e.error = err
      },
    )
    .finally(() => {
      e.loading = false
      e.promise = undefined
      publish(e)
    })
  return e.promise
}

const refetchers = new Map<string, () => void>()

/** Re-runs every mounted resource whose key starts with `prefix`. */
export function invalidate(prefix: string) {
  for (const [key, refetch] of refetchers) if (key.startsWith(prefix)) refetch()
}

export function useResource<T>(key: string | null, fetcher: () => Promise<T>, opts: { refreshMs?: number } = {}) {
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => {}
      const e = entry(key)
      e.subs.add(cb)
      return () => e.subs.delete(cb)
    },
    [key],
  )
  const snap = useSyncExternalStore(subscribe, () => (key ? entry(key).snapshot : IDLE)) as Snapshot<T>

  const refresh = useCallback(() => {
    if (key) void run(key, () => fetcherRef.current())
  }, [key])

  useEffect(() => {
    if (!key) return
    const e = entry(key)
    if (e.updatedAt === undefined && !e.promise) refresh()
    refetchers.set(key, refresh)
    let timer: number | undefined
    if (opts.refreshMs) {
      timer = window.setInterval(() => {
        if (!document.hidden) refresh()
      }, opts.refreshMs)
    }
    return () => {
      window.clearInterval(timer)
      if (refetchers.get(key) === refresh) refetchers.delete(key)
    }
  }, [key, refresh, opts.refreshMs])

  return { ...snap, refresh }
}
