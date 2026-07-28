/**
 * 一次性数据迁移工具：把历史任务的旧颜色映射到当前色板。
 *
 * 从 stores/task.ts 抽离，直接基于 getStorage() 操作，不依赖 Pinia 实例，
 * 便于在应用启动（main.ts）和备份导入后统一调用。
 */
import { LEGACY_COLOR_MAP } from '@/types'
import { getStorage } from '@/utils/storage'

/** 迁移标记 localStorage key（升版 v3，强制所有用户重跑修正后的迁移） */
const MIGRATE_KEY = 'qingji_color_migrated_v3'

/**
 * 迁移历史任务的旧颜色到当前色板。
 * - 已迁移（标记为 true）则跳过，避免重复执行。
 * - 全量扫描 getAllTasks()，命中 LEGACY_COLOR_MAP 的逐一 updateTask。
 * - 成功后设置标记；失败不设标记，下次启动重试。
 */
export async function migrateLegacyTaskColors(): Promise<void> {
  if (localStorage.getItem(MIGRATE_KEY) === 'true') return
  try {
    const storage = getStorage()
    const all = await storage.getAllTasks()
    for (const t of all) {
      if (t.color && LEGACY_COLOR_MAP[t.color]) {
        await storage.updateTask(t.id, { color: LEGACY_COLOR_MAP[t.color] })
      }
    }
    localStorage.setItem(MIGRATE_KEY, 'true')
  } catch (err) {
    console.error('[qingji] 颜色迁移失败：', err)
  }
}

/**
 * 强制重跑迁移（用于备份导入后：旧备份可能引入遗留色）。
 * 清除标记后立即执行迁移。
 */
export async function forceMigrateLegacyTaskColors(): Promise<void> {
  localStorage.removeItem(MIGRATE_KEY)
  await migrateLegacyTaskColors()
}
