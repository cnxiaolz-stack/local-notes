import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initDatabase } from '@/utils/db'
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

// 先初始化本地数据库，再挂载应用
;(async () => {
  try {
    await initDatabase()
  } catch (err) {
    // 数据库初始化失败时打印详细错误，便于排查（不阻断挂载，PWA 端可降级）
    console.error('[qingji] 数据库初始化失败：', err)
  }
  app.mount('#app')
})()
