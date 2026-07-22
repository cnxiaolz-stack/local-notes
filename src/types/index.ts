// 轻记数据模型类型定义

/** 任务 */
export interface Task {
  /** uuid */
  id: string
  /** YYYY-MM-DD 任务所属日期 */
  date: string
  /** 任务内容 */
  content: string
  /** 是否完成 */
  completed: boolean
  /** 创建时间戳(ms) */
  created_at: number
  /** 更新时间戳(ms) */
  updated_at: number
  /** 排序 */
  order: number
}

/** 便签 */
export interface Note {
  /** uuid */
  id: string
  /** 标题（可为空，从内容首行提取） */
  title: string
  /** 正文 */
  content: string
  /** 创建时间戳(ms) */
  created_at: number
  /** 更新时间戳(ms) */
  updated_at: number
}

/** 日记（一天一篇，主键为 date） */
export interface Diary {
  /** YYYY-MM-DD 一天一篇 */
  date: string
  /** 正文 */
  content: string
  /** 创建时间戳(ms) */
  created_at: number
  /** 更新时间戳(ms) */
  updated_at: number
}

/** 备份/导入导出数据结构 */
export interface BackupData {
  /** 数据版本号 */
  version: number
  /** 导出时间戳(ms) */
  exported_at: number
  /** 全部任务 */
  tasks: Task[]
  /** 全部便签 */
  notes: Note[]
  /** 全部日记 */
  diaries: Diary[]
}
