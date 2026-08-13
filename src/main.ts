import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { getStorage } from '@/utils/storage'
import { migrateLegacyTaskColors } from '@/utils/migrate'
import { isTauriEnv } from '@/utils/env'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 禁用全局右键菜单（对应交互重构 H：应用图标等内容不可复制/选中）
// Tauri 2 不再支持 tauri.conf.json 的 disableContextMenu 字段，改在前端拦截。
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
}

/**
 * Tauri 桌面端：注销可能残留的 PWA Service Worker 与缓存。
 * 历史构建曾误把 vite-plugin-pwa 的 SW 打进 Tauri 包，导致升级用户
 * WebView 持续加载旧前端缓存、新代码不生效。此处主动清理，确保
 * 新版本代码能真正运行。
 */
async function cleanupServiceWorker(): Promise<void> {
  if (!isTauriEnv()) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    console.log('[qingji] 已清理残留 Service Worker 与缓存')
  } catch (err) {
    console.warn('[qingji] 清理 SW 失败（可忽略）：', err)
  }
}

// 先初始化数据库，清理 SW，执行数据迁移，再挂载应用
;(async () => {
  try {
    await getStorage().init()
  } catch (err) {
    // 数据库初始化失败时打印详细错误，便于排查（不阻断挂载，PWA 端可降级）
    console.error('[qingji] 数据库初始化失败：', err)
  }
  await cleanupServiceWorker()
  await migrateLegacyTaskColors()
  app.mount('#app')
})()
