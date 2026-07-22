// 数据库初始化入口：供 main.ts 调用
import { getStorage } from '@/utils/storage'

/**
 * 初始化底层数据库（建表 / 打开连接）。
 * 根据运行环境自动选择 SQLite 或 IndexedDB 适配器。
 */
export async function initDatabase(): Promise<void> {
  await getStorage().init()
}
