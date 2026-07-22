// 生成"轻记"应用图标：纯白底 + 黑体"记"字 + 蓝色下划线点缀
// 运行：node scripts/gen-icons.mjs
// 依赖：@resvg/resvg-js（将 SVG 渲染为 PNG）；scripts/fonts/SimHei.ttf（黑体字形）
//
// 设计要点（对应交互重构方案 G）：
// - 1024×1024 画布，圆角矩形底（rx=228），纯白背景（与极简主题一致）
// - 中央大字"记"，黑体风格（SimHei，不太尖锐），深灰黑 #111827
// - 底部一抹品牌蓝下划线（#3b82f6）增加设计感
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fontPath = join(__dirname, 'fonts', 'SimHei.ttf')

if (!existsSync(fontPath)) {
  console.error(`✗ 缺少黑体字体文件：${fontPath}`)
  console.error('  请放置 SimHei.ttf 到 scripts/fonts/ 后重试。')
  console.error('  下载参考：https://cdn.jsdelivr.net/gh/StellarCN/scp_zh/fonts/SimHei.ttf')
  process.exit(1)
}

// 字体族名（SVG 中引用；resvg 会用加载的 SimHei.ttf 渲染）
const FONT_FAMILY = "SimHei, 'PingFang SC', 'Microsoft YaHei', 'Heiti SC', sans-serif"

// 图标 SVG 设计（1024×1024 画布）
function iconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- 纯白圆角底 -->
  <rect x="0" y="0" width="1024" height="1024" rx="228" ry="228" fill="#ffffff"/>

  <!-- 中央"记"字（黑体，深灰黑） -->
  <text x="512" y="512" text-anchor="middle" dominant-baseline="central"
        font-family="${FONT_FAMILY}" font-size="600" font-weight="700"
        fill="#111827">记</text>

  <!-- 品牌蓝下划线点缀 -->
  <rect x="412" y="828" width="200" height="10" rx="5" ry="5" fill="#3b82f6"/>
</svg>`
}

const svg = iconSVG()
mkdirSync('public', { recursive: true })
mkdirSync('src-tauri/icons', { recursive: true })

const fontOptions = {
  fontFiles: [fontPath],
  loadSystemFonts: false,
  defaultFontFamily: 'SimHei'
}

const sizes = [
  ['src-tauri/icons/source.png', 1024],
  ['public/pwa-512x512.png', 512],
  ['public/pwa-192x192.png', 192],
  ['public/apple-touch-icon.png', 180]
]

for (const [path, size] of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
    font: fontOptions
  })
  const png = resvg.render().asPng()
  writeFileSync(path, png)
  console.log(`✓ ${path} (${size}×${size})`)
}

writeFileSync('public/favicon.svg', svg)
console.log('✓ public/favicon.svg')

console.log('\n图标生成完成。运行 `pnpm tauri icon src-tauri/icons/source.png` 派生全平台图标。')
