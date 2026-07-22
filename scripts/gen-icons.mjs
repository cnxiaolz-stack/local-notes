// 一次性脚本：生成占位 PNG 图标（纯品牌蓝）。
// 运行：node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function makePNG(size, [r, g, b]) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0 // filter: none
  for (let i = 0; i < size; i++) {
    row[1 + i * 3] = r
    row[1 + i * 3 + 1] = g
    row[1 + i * 3 + 2] = b
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  const idat = deflateSync(raw)

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const brand = [59, 130, 246] // #3b82f6

mkdirSync('public', { recursive: true })
mkdirSync('src-tauri/icons', { recursive: true })

writeFileSync('public/pwa-192x192.png', makePNG(192, brand))
writeFileSync('public/pwa-512x512.png', makePNG(512, brand))
writeFileSync('public/apple-touch-icon.png', makePNG(180, brand))
writeFileSync('src-tauri/icons/source.png', makePNG(1024, brand))

console.log('Icons generated.')
