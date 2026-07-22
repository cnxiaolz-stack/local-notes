// 生成"轻记"应用图标：折角便签 + 玻璃质感
// 运行：node scripts/gen-icons.mjs
// 依赖：@resvg/resvg-js（将 SVG 渲染为 PNG）
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'node:fs'

// 图标 SVG 设计（1024×1024 画布）
// 元素：① 蓝紫渐变圆角背景 ② 白色半透明便签 ③ 右上角折角 ④ 玻璃高光
function iconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="paper" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#f5f3ff" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="fold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c7d2fe" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#a5b4fc" stop-opacity="0.8"/>
    </linearGradient>
    <radialGradient id="glow" cx="28%" cy="22%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="1024" height="1024" rx="224" ry="224" fill="url(#bg)"/>

  <path d="
    M 312 300
    L 632 300
    L 762 430
    L 762 710
    Q 762 760 712 760
    L 312 760
    Q 262 760 262 710
    L 262 350
    Q 262 300 312 300
    Z
  " fill="url(#paper)"/>

  <path d="M 632 300 L 632 430 L 762 430 Z" fill="url(#fold)"/>
  <path d="M 632 300 L 632 430 L 762 430" fill="none" stroke="#6366f1" stroke-opacity="0.18" stroke-width="3" stroke-linejoin="round"/>

  <line x1="312" y1="500" x2="662" y2="500" stroke="#a5b4fc" stroke-opacity="0.55" stroke-width="14" stroke-linecap="round"/>
  <line x1="312" y1="570" x2="712" y2="570" stroke="#a5b4fc" stroke-opacity="0.45" stroke-width="14" stroke-linecap="round"/>
  <line x1="312" y1="640" x2="612" y2="640" stroke="#a5b4fc" stroke-opacity="0.35" stroke-width="14" stroke-linecap="round"/>

  <rect x="0" y="0" width="1024" height="1024" rx="224" ry="224" fill="url(#glow)"/>
</svg>`
}

const svg = iconSVG()
mkdirSync('public', { recursive: true })
mkdirSync('src-tauri/icons', { recursive: true })

const sizes = [
  ['src-tauri/icons/source.png', 1024],
  ['public/pwa-512x512.png', 512],
  ['public/pwa-192x192.png', 192],
  ['public/apple-touch-icon.png', 180]
]

for (const [path, size] of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)'
  })
  const png = resvg.render().asPng()
  writeFileSync(path, png)
  console.log(`✓ ${path} (${size}×${size})`)
}

writeFileSync('public/favicon.svg', svg)
console.log('✓ public/favicon.svg')

console.log('\n图标生成完成。运行 `pnpm tauri icon src-tauri/icons/source.png` 派生全平台图标。')
