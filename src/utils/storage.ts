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
  /** 分页查询任务（按 created_at DESC），用于全部任务列表滚动加载 */
  getTasksPage(limit: number, offset: number): Promise<Task[]>
  createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task>
  updateTask(id: string, patch: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>
  /** 查询有任务的日期集合（YYYY-MM-DD） */
  getTaskDates(): Promise<string[]>

  // ---- Notes ----
  getAllNotes(): Promise<Note[]>
  getNotesByDate(date: string): Promise<Note[]>
  getNote(id: string): Promise<Note | null>
  /** 分页查询便签（按 updated_at DESC），用于列表滚动加载 */
  getNotesPage(limit: number, offset: number): Promise<Note[]>
  createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note>
  updateNote(id: string, patch: Partial<Note>): Promise<Note>
  deleteNote(id: string): Promise<void>

  // ---- Diaries ----
  getDiary(date: string): Promise<Diary | null>
  getAllDiaries(): Promise<Diary[]>
  /** 分页查询日记（按 date DESC），用于列表滚动加载 */
  getDiariesPage(limit: number, offset: number): Promise<Diary[]>
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
