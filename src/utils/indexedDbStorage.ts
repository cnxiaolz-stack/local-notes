// PWA 端（浏览器）IndexedDB 存储适配器，基于 Dexie
import Dexie from 'dexie'
import type { EntityTable } from 'dexie'
import type { BackupData, Diary, Note, Task } from '@/types'
import type { StorageAdapter } from '@/utils/storage'
import { tsToDateStr } from '@/utils/time'

/**
 * Dexie 子类：定义三张表。
 * - tasks: 主键 id，索引 date
 * - notes: 主键 id，索引 updated_at / date / archived
 * - diaries: 主键 date
 */
class QingJiDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  notes!: EntityTable<Note, 'id'>
  diaries!: EntityTable<Diary, 'date'>

  constructor() {
    super('qingji')
    this.version(1).stores({
      tasks: 'id, date',
      notes: 'id, updated_at',
      diaries: 'date'
    })
    // v2：notes 加 date / archived 索引；tasks 加 color 字段（Dexie 索引语法不含 color，但数据结构允许）
    this.version(2).stores({
      tasks: 'id, date',
      notes: 'id, updated_at, date, archived',
      diaries: 'date'
    })
  }
}

/** 模块级 Dexie 实例缓存 */
let dbInstance: QingJiDB | null = null

function getDb(): QingJiDB {
  if (!dbInstance) {
    dbInstance = new QingJiDB()
  }
  return dbInstance
}

/** 存量数据迁移：给已有便签回填 date / archived */
async function migrateNotes(): Promise<void> {
  const db = getDb()
  const stale = await db.notes.filter((n) => !n.date).toArray()
  for (const n of stale) {
    await db.notes.put({
      ...n,
      date: tsToDateStr(n.created_at),
      archived: n.archived ?? false,
      archived_at: n.archived_at ?? null
    })
  }
}

/**
 * PWA 端 IndexedDB 适配器。
 */
export class IndexedDbStorage implements StorageAdapter {
  async init(): Promise<void> {
    const db = getDb()
    if (!db.isOpen()) {
      await db.open()
    }
    await migrateNotes()
  }

  // ---------- Tasks ----------

  async getTasksByDate(date: string): Promise<Task[]> {
    const items = await getDb().tasks.where('date').equals(date).toArray()
    return items.sort((a, b) => a.order - b.order)
  }

  async getAllTasks(): Promise<Task[]> {
    const items = await getDb().tasks.toArray()
    return items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      return a.order - b.order
    })
  }

  async getTasksPage(limit: number, offset: number): Promise<Task[]> {
    return getDb().tasks.orderBy('created_at').reverse().offset(offset).limit(limit).toArray()
  }

  async getTaskDates(): Promise<string[]> {
    const items = await getDb().tasks.toArray()
    const set = new Set(items.map((t) => t.date))
    return Array.from(set).sort()
  }

  async createTask(
    task: Omit<Task, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Task> {
    const now = Date.now()
    const record: Task = {
      ...task,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }
    await getDb().tasks.add(record)
    return record
  }

  async updateTask(id: string, patch: Partial<Task>): Promise<Task> {
    const current = await getDb().tasks.get(id)
    if (!current) {
      throw new Error(`updateTask: 任务不存在 id=${id}`)
    }
    const next: Task = {
      ...current,
      ...patch,
      id: current.id,
      updated_at: Date.now()
    }
    await getDb().tasks.put(next)
    return next
  }

  async deleteTask(id: string): Promise<void> {
    await getDb().tasks.delete(id)
  }

  // ---------- Notes ----------

  async getAllNotes(): Promise<Note[]> {
    return getDb().notes.orderBy('updated_at').reverse().toArray()
  }

  async getNotesPage(limit: number, offset: number): Promise<Note[]> {
    return getDb()
      .notes.orderBy('updated_at')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray()
  }

  async getNotesByDate(date: string): Promise<Note[]> {
    const items = await getDb().notes.where('date').equals(date).toArray()
    return items.sort((a, b) => a.created_at - b.created_at)
  }

  async getNote(id: string): Promise<Note | null> {
    const item = await getDb().notes.get(id)
    return item ?? null
  }

  async createNote(
    note: Omit<Note, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Note> {
    const now = Date.now()
    const record: Note = {
      ...note,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now
    }
    await getDb().notes.add(record)
    return record
  }

  async updateNote(id: string, patch: Partial<Note>): Promise<Note> {
    const current = await getDb().notes.get(id)
    if (!current) {
      throw new Error(`updateNote: 便签不存在 id=${id}`)
    }
    const next: Note = {
      ...current,
      ...patch,
      id: current.id,
      updated_at: Date.now()
    }
    await getDb().notes.put(next)
    return next
  }

  async deleteNote(id: string): Promise<void> {
    await getDb().notes.delete(id)
  }

  // ---------- Diaries ----------

  async getDiary(date: string): Promise<Diary | null> {
    const item = await getDb().diaries.get(date)
    return item ?? null
  }

  async getAllDiaries(): Promise<Diary[]> {
    const items = await getDb().diaries.toArray()
    return items.sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  async getDiariesPage(limit: number, offset: number): Promise<Diary[]> {
    // diaries 主键即 date，orderBy('date') 倒序
    return getDb()
      .diaries.orderBy('date')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray()
  }

  async upsertDiary(
    diary: Omit<Diary, 'created_at' | 'updated_at'> & { date: string }
  ): Promise<Diary> {
    const now = Date.now()
    const db = getDb()
    const existing = await db.diaries.get(diary.date)
    if (existing) {
      const next: Diary = {
        ...existing,
        content: diary.content,
        updated_at: now
      }
      await db.diaries.put(next)
      return next
    }
    const record: Diary = {
      date: diary.date,
      content: diary.content,
      created_at: now,
      updated_at: now
    }
    await db.diaries.put(record)
    return record
  }

  async deleteDiary(date: string): Promise<void> {
    await getDb().diaries.delete(date)
  }

  // ---------- 备份/恢复 ----------

  async getAllData(): Promise<BackupData> {
    const db = getDb()
    const [tasks, notes, diaries] = await Promise.all([
      db.tasks.toArray(),
      db.notes.toArray(),
      db.diaries.toArray()
    ])
    return {
      version: 1,
      exported_at: Date.now(),
      tasks,
      notes,
      diaries
    }
  }

  async replaceAllData(data: BackupData): Promise<void> {
    const db = getDb()
    await db.transaction('rw', db.tasks, db.notes, db.diaries, async () => {
      await db.tasks.clear()
      await db.notes.clear()
      await db.diaries.clear()
      await db.tasks.bulkAdd(data.tasks)
      // 便签回填 date 字段（兼容旧备份）
      const notes = data.notes.map((n) => ({
        ...n,
        date: n.date || tsToDateStr(n.created_at),
        archived: n.archived ?? false,
        archived_at: n.archived_at ?? null
      }))
      await db.notes.bulkAdd(notes)
      await db.diaries.bulkAdd(data.diaries)
    })
  }
}
