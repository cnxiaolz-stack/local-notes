// 统一存储抽象接口 + 环境检测 + 适配器单例选择
import type { BackupData, Diary, Note, Task } from '@/types'
import { SQLiteStorage } from '@/utils/sqliteStorage'
import { IndexedDbStorage } from '@/utils/indexedDbStorage'

/**
 * 统一存储适配器接口：每个实体提供 CRUD，外加备份/恢复与初始化。
 * 桌面端（Tauri）使用 SQLite 实现，PWA 端使用 IndexedDB 实现。
 */
export interface StorageAdapter {
  // ---- Tasks ----
  getTasksByDate(date: string): Promise<Task[]>
  getAllTasks(): Promise<Task[]>
  createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task>
  updateTask(id: string, patch: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>

  // ---- Notes ----
  getAllNotes(): Promise<Note[]>
  getNote(id: string): Promise<Note | null>
  createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note>
  updateNote(id: string, patch: Partial<Note>): Promise<Note>
  deleteNote(id: string): Promise<void>

  // ---- Diaries ----
  getDiary(date: string): Promise<Diary | null>
  getAllDiaries(): Promise<Diary[]>
  upsertDiary(diary: Omit<Diary, 'created_at' | 'updated_at'> & { date: string }): Promise<Diary>
  deleteDiary(date: string): Promise<void>

  // ---- 备份/恢复 ----
  getAllData(): Promise<BackupData>
  replaceAllData(data: BackupData): Promise<void>

  // ---- 初始化 ----
  init(): Promise<void>
}

let storageInstance: StorageAdapter | null = null

/**
 * 判断当前是否运行在 Tauri 桌面端环境。
 */
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 获取存储适配器单例。
 * - Tauri 环境 -> SQLiteStorage
 * - 其它（浏览器/PWA）-> IndexedDbStorage
 */
export function getStorage(): StorageAdapter {
  if (storageInstance) return storageInstance
  storageInstance = isTauriEnvironment()
    ? new SQLiteStorage()
    : new IndexedDbStorage()
  return storageInstance
}
