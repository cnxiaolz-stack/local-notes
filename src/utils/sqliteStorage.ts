// 桌面端（Tauri）SQLite 存储适配器
import Database from '@tauri-apps/plugin-sql'
import type { BackupData, Diary, Note, Task } from '@/types'
import type { StorageAdapter } from '@/utils/storage'
import { tsToDateStr } from '@/utils/time'

/** 数据库文件名（相对于 Tauri App 数据目录） */
const DB_PATH = 'sqlite:qingji.db'

/** tasks 表行结构（completed 以 0/1 存储，order 列名为 order_index） */
interface TaskRow {
  id: string
  date: string
  content: string
  completed: number
  created_at: number
  updated_at: number
  order_index: number
  color: string | null
}

/** notes 表行结构 */
interface NoteRow {
  id: string
  title: string
  content: string
  created_at: number
  updated_at: number
  date: string
  archived: number
  archived_at: number | null
}

/** diaries 表行结构 */
interface DiaryRow {
  date: string
  content: string
  created_at: number
  updated_at: number
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    date: row.date,
    content: row.content,
    completed: !!row.completed,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order: row.order_index,
    color: row.color ?? undefined
  }
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    date: row.date,
    archived: !!row.archived,
    archived_at: row.archived_at
  }
}

function rowToDiary(row: DiaryRow): Diary {
  return {
    date: row.date,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

/** 模块级 Database 实例缓存，init() 时加载 */
let dbInstance: Database | null = null

/**
 * 桌面端 SQLite 适配器。
 * 通过 @tauri-apps/plugin-sql 与 Rust 侧 sql 插件通信。
 */
export class SQLiteStorage implements StorageAdapter {
  /** 获取已加载的 Database 实例；未初始化时抛错。 */
  private getDb(): Database {
    if (!dbInstance) {
      throw new Error('SQLiteStorage 未初始化，请先调用 init()')
    }
    return dbInstance
  }

  async init(): Promise<void> {
    if (!dbInstance) {
      dbInstance = await Database.load(DB_PATH)
    }
    const db = dbInstance
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        completed INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        color TEXT
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        date TEXT,
        archived INTEGER DEFAULT 0,
        archived_at INTEGER
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS diaries (
        date TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)'
    )
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)'
    )
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date)'
    )
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_diaries_date ON diaries(date)'
    )

    // 存量数据迁移：给已有便签回填 date（按 created_at 转本地日期）
    await db.execute(`
      UPDATE notes SET date = strftime('%Y-%m-%d', created_at/1000, 'unixepoch', 'localtime')
      WHERE date IS NULL
    `)
    await db.execute(`UPDATE notes SET archived = 0 WHERE archived IS NULL`)
  }

  // ---------- Tasks ----------

  async getTasksByDate(date: string): Promise<Task[]> {
    const rows = await this.getDb().select<TaskRow[]>(
      'SELECT * FROM tasks WHERE date = $1 ORDER BY order_index ASC',
      [date]
    )
    return rows.map(rowToTask)
  }

  async getAllTasks(): Promise<Task[]> {
    const rows = await this.getDb().select<TaskRow[]>(
      'SELECT * FROM tasks ORDER BY date ASC, order_index ASC'
    )
    return rows.map(rowToTask)
  }

  async getTaskDates(): Promise<string[]> {
    const rows = await this.getDb().select<{ date: string }[]>(
      'SELECT DISTINCT date FROM tasks ORDER BY date ASC'
    )
    return rows.map((r) => r.date)
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
    await this.getDb().execute(
      `INSERT INTO tasks (id, date, content, completed, created_at, updated_at, order_index, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.id,
        record.date,
        record.content,
        record.completed ? 1 : 0,
        record.created_at,
        record.updated_at,
        record.order,
        record.color ?? null
      ]
    )
    return record
  }

  async updateTask(id: string, patch: Partial<Task>): Promise<Task> {
    const rows = await this.getDb().select<TaskRow[]>(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    )
    if (rows.length === 0) {
      throw new Error(`updateTask: 任务不存在 id=${id}`)
    }
    const current = rowToTask(rows[0])
    const next: Task = {
      ...current,
      ...patch,
      id: current.id,
      updated_at: Date.now()
    }
    await this.getDb().execute(
      `UPDATE tasks
       SET date = $1, content = $2, completed = $3, updated_at = $4, order_index = $5, color = $6
       WHERE id = $7`,
      [
        next.date,
        next.content,
        next.completed ? 1 : 0,
        next.updated_at,
        next.order,
        next.color ?? null,
        next.id
      ]
    )
    return next
  }

  async deleteTask(id: string): Promise<void> {
    await this.getDb().execute('DELETE FROM tasks WHERE id = $1', [id])
  }

  // ---------- Notes ----------

  async getAllNotes(): Promise<Note[]> {
    const rows = await this.getDb().select<NoteRow[]>(
      'SELECT * FROM notes ORDER BY updated_at DESC'
    )
    return rows.map(rowToNote)
  }

  async getNotesByDate(date: string): Promise<Note[]> {
    const rows = await this.getDb().select<NoteRow[]>(
      'SELECT * FROM notes WHERE date = $1 ORDER BY created_at ASC',
      [date]
    )
    return rows.map(rowToNote)
  }

  async getNote(id: string): Promise<Note | null> {
    const rows = await this.getDb().select<NoteRow[]>(
      'SELECT * FROM notes WHERE id = $1',
      [id]
    )
    if (rows.length === 0) return null
    return rowToNote(rows[0])
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
    await this.getDb().execute(
      `INSERT INTO notes (id, title, content, created_at, updated_at, date, archived, archived_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.id,
        record.title,
        record.content,
        record.created_at,
        record.updated_at,
        record.date,
        record.archived ? 1 : 0,
        record.archived_at
      ]
    )
    return record
  }

  async updateNote(id: string, patch: Partial<Note>): Promise<Note> {
    const rows = await this.getDb().select<NoteRow[]>(
      'SELECT * FROM notes WHERE id = $1',
      [id]
    )
    if (rows.length === 0) {
      throw new Error(`updateNote: 便签不存在 id=${id}`)
    }
    const current = rowToNote(rows[0])
    const next: Note = {
      ...current,
      ...patch,
      id: current.id,
      updated_at: Date.now()
    }
    await this.getDb().execute(
      `UPDATE notes
       SET title = $1, content = $2, updated_at = $3, date = $4, archived = $5, archived_at = $6
       WHERE id = $7`,
      [
        next.title,
        next.content,
        next.updated_at,
        next.date,
        next.archived ? 1 : 0,
        next.archived_at,
        next.id
      ]
    )
    return next
  }

  async deleteNote(id: string): Promise<void> {
    await this.getDb().execute('DELETE FROM notes WHERE id = $1', [id])
  }

  // ---------- Diaries ----------

  async getDiary(date: string): Promise<Diary | null> {
    const rows = await this.getDb().select<DiaryRow[]>(
      'SELECT * FROM diaries WHERE date = $1',
      [date]
    )
    if (rows.length === 0) return null
    return rowToDiary(rows[0])
  }

  async getAllDiaries(): Promise<Diary[]> {
    const rows = await this.getDb().select<DiaryRow[]>(
      'SELECT * FROM diaries ORDER BY date DESC'
    )
    return rows.map(rowToDiary)
  }

  async upsertDiary(
    diary: Omit<Diary, 'created_at' | 'updated_at'> & { date: string }
  ): Promise<Diary> {
    const now = Date.now()
    const existing = await this.getDiary(diary.date)
    if (existing) {
      const next: Diary = {
        ...existing,
        content: diary.content,
        updated_at: now
      }
      await this.getDb().execute(
        'UPDATE diaries SET content = $1, updated_at = $2 WHERE date = $3',
        [next.content, next.updated_at, next.date]
      )
      return next
    }
    const record: Diary = {
      date: diary.date,
      content: diary.content,
      created_at: now,
      updated_at: now
    }
    await this.getDb().execute(
      `INSERT INTO diaries (date, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [record.date, record.content, record.created_at, record.updated_at]
    )
    return record
  }

  async deleteDiary(date: string): Promise<void> {
    await this.getDb().execute('DELETE FROM diaries WHERE date = $1', [date])
  }

  // ---------- 备份/恢复 ----------

  async getAllData(): Promise<BackupData> {
    const [tasks, notes, diaries] = await Promise.all([
      this.getAllTasks(),
      this.getAllNotes(),
      this.getAllDiaries()
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
    const db = this.getDb()
    await db.execute('DELETE FROM tasks')
    await db.execute('DELETE FROM notes')
    await db.execute('DELETE FROM diaries')
    for (const t of data.tasks) {
      await db.execute(
        `INSERT INTO tasks (id, date, content, completed, created_at, updated_at, order_index, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          t.id,
          t.date,
          t.content,
          t.completed ? 1 : 0,
          t.created_at,
          t.updated_at,
          t.order,
          t.color ?? null
        ]
      )
    }
    for (const n of data.notes) {
      await db.execute(
        `INSERT INTO notes (id, title, content, created_at, updated_at, date, archived, archived_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          n.id,
          n.title,
          n.content,
          n.created_at,
          n.updated_at,
          n.date || tsToDateStr(n.created_at),
          n.archived ? 1 : 0,
          n.archived_at ?? null
        ]
      )
    }
    for (const d of data.diaries) {
      await db.execute(
        `INSERT INTO diaries (date, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4)`,
        [d.date, d.content, d.created_at, d.updated_at]
      )
    }
  }
}
