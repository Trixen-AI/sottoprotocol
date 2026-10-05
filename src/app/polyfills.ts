import { Buffer } from 'buffer'

// Some Solana libraries expect a global Buffer in the browser.
const g = globalThis as unknown as { Buffer?: typeof Buffer }
if (!g.Buffer) g.Buffer = Buffer
