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
