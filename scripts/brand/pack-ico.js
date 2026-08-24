/**
 * Packs the 16/32/48 PNGs from render.js into public/favicon.ico.
 *
 *   node scripts/brand/pack-ico.js
 *
 * ICO files may carry PNG payloads directly, which every browser since Vista
 * reads and which is far smaller than the equivalent BMP encoding.
 */
const fs = require('fs')
const path = require('path')

const SIZES = [16, 32, 48]
const HERE = __dirname
const OUT = path.join(HERE, 'out')
const TARGET = path.resolve(HERE, '..', '..', 'public', 'favicon.ico')

const images = SIZES.map((size) => {
  const file = path.join(OUT, `icon-${size}.png`)
  if (!fs.existsSync(file)) {
    throw new Error(`${file} is missing — run scripts/brand/render.js first.`)
  }
  return { size, data: fs.readFileSync(file) }
})

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // 1 = icon
header.writeUInt16LE(images.length, 4)

let offset = 6 + 16 * images.length
const entries = []

for (const { size, data } of images) {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size < 256 ? size : 0, 0) // width, 0 means 256
  entry.writeUInt8(size < 256 ? size : 0, 1) // height
  entry.writeUInt8(0, 2) // palette colours
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(data.length, 8)
  entry.writeUInt32LE(offset, 12)
  entries.push(entry)
  offset += data.length
}

fs.writeFileSync(TARGET, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]))
console.log(`wrote public/favicon.ico (${SIZES.join(', ')}px)`)
