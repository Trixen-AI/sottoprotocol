// Renders the social share image and app icons from the logo source.
// Writes public/og.png (1200x630), public/apple-touch-icon.png (180), public/icon-192.png, public/icon-512.png.
// Run: node scripts/build-meta.mjs   (after scripts/build-logo.mjs if the logo changed)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const paths = readFileSync(join(root, 'src/components/brand/logoPaths.ts'), 'utf8')
const read = (name) => JSON.parse(paths.match(new RegExp(`${name} = (".*")`))[1])
const MARK = read('MARK_PATH')
const WORD = read('WORD_PATH')
const LOGO_W = Number(paths.match(/LOGO_WIDTH = (\d+)/)[1])

const INK = '#14121C'
const WASH = '#F6F4FF'
const MUTED = '#706B7E'
const font = join(root, 'scripts/fonts/DMSans-500.ttf')

function render(svg, file) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'DM Sans' },
  })
    .render()
    .asPng()
  writeFileSync(join(root, 'public', file), png)
}

// Share card: wordmark, headline, line of copy, and the gold seal from the site's closing section.
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="0.78" cy="0.45" r="0.55">
      <stop offset="0" stop-color="#CDBEFF" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${WASH}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="seal" cx="0.5" cy="0.6" r="0.6">
      <stop offset="0" stop-color="#FFDF9A"/>
      <stop offset="0.58" stop-color="#F2B43C"/>
      <stop offset="1" stop-color="#D9901A"/>
    </radialGradient>
    <radialGradient id="shine" cx="0.34" cy="0.28" r="0.42">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${WASH}"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <ellipse cx="930" cy="330" rx="250" ry="78" fill="none" stroke="#A08CEB" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="3 12" transform="rotate(-8 930 330)"/>
  <circle cx="930" cy="320" r="140" fill="url(#seal)"/>
  <circle cx="930" cy="320" r="140" fill="url(#shine)"/>
  <g transform="translate(860 250) scale(4.375)" fill="#FFFFFF" fill-opacity="0.7"><path fill-rule="evenodd" d="${MARK}"/></g>
  <g transform="translate(80 72) scale(1.6)" fill="${INK}">
    <path fill-rule="evenodd" d="${MARK}"/><path d="${WORD}"/>
  </g>
  <text x="80" y="300" font-family="DM Sans" font-size="78" fill="${INK}" letter-spacing="-1">Private payments</text>
  <text x="80" y="388" font-family="DM Sans" font-size="78" fill="${INK}" letter-spacing="-1">on Solana.</text>
  <text x="80" y="460" font-family="DM Sans" font-size="30" fill="${MUTED}">Zcash built in. Prove where a payment came from.</text>
  <text x="80" y="560" font-family="DM Sans" font-size="26" fill="${INK}">sottoprotocol.cash</text>
</svg>`
render(og, 'og.png')

// App icons: the mark on the brand wash, inside the maskable safe zone.
const icon = (size, markShare) => {
  const m = size * markShare
  const off = (size - m) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${WASH}"/>
    <g transform="translate(${off} ${off}) scale(${m / 32})" fill="${INK}"><path fill-rule="evenodd" d="${MARK}"/></g>
  </svg>`
}
render(icon(180, 0.62), 'apple-touch-icon.png')
render(icon(192, 0.56), 'icon-192.png')
render(icon(512, 0.56), 'icon-512.png')

console.log('meta images built', { logoWidth: LOGO_W })
