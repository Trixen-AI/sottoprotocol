const enc = new TextEncoder()
const dec = new TextDecoder()

export function toBase64Url(bytes: Uint8Array) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function encodeJson(value: unknown) {
  return toBase64Url(enc.encode(JSON.stringify(value)))
}

export function decodeJson<T>(code: string): T {
  return JSON.parse(dec.decode(fromBase64Url(code))) as T
}

/** JSON with sorted keys, so the same object always produces the same bytes to sign. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(',')}}`
}

export function utf8(s: string) {
  return enc.encode(s)
}
