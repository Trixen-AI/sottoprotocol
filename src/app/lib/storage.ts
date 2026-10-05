import { useCallback, useSyncExternalStore } from 'react'

// Versioned localStorage with a per-key cache, so React gets a stable snapshot and every tab stays in sync.
const PREFIX = 'sotto:v1:'
const cache = new Map<string, { raw: string | null; value: unknown }>()
const listeners = new Map<string, Set<() => void>>()

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key?.startsWith(PREFIX)) return
    const key = e.key.slice(PREFIX.length)
    cache.delete(key)
    emit(key)
  })
}

export function readStored<T>(key: string, fallback: T): T {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(PREFIX + key)
  } catch {
    return fallback
  }
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return (hit.value ?? fallback) as T
  let value: unknown = fallback
  if (raw != null) {
    try {
      value = JSON.parse(raw)
    } catch {
      value = fallback
    }
  }
  cache.set(key, { raw, value })
  return value as T
}

export function writeStored<T>(key: string, value: T) {
  const raw = JSON.stringify(value)
  try {
    localStorage.setItem(PREFIX + key, raw)
  } catch {
    // storage full or blocked: keep the in-memory value for this session
  }
  cache.set(key, { raw, value })
  emit(key)
}

export function removeStored(prefix: string) {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX + prefix)) {
        localStorage.removeItem(k)
        const key = k.slice(PREFIX.length)
        cache.delete(key)
        emit(key)
      }
    }
  } catch {
    // ignore
  }
}

/** `fallback` must be a stable reference (a module-level constant). */
export function useStored<T>(key: string | null, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => {}
      const set = listeners.get(key) ?? new Set()
      set.add(cb)
      listeners.set(key, set)
      return () => set.delete(cb)
    },
    [key],
  )
  const value = useSyncExternalStore(subscribe, () => (key ? readStored(key, fallback) : fallback))
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      if (!key) return
      const prev = readStored(key, fallback)
      writeStored(key, typeof next === 'function' ? (next as (p: T) => T)(prev) : next)
    },
    [key, fallback],
  )
  return [value, set]
}
