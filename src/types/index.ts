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
  /** 圆圈颜色（hex，新建时从预设色板随机取） */
  color?: string
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
  /** YYYY-MM-DD 归属日期（= 创建当天的日期） */
  date: string
  /** 是否归档 */
  archived: boolean
  /** 归档时间戳(ms)，未归档时为 null */
  archived_at: number | null
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

/** 任务圆圈预设色板 */
export const TASK_COLORS = [
  '#3b82f6', // 蓝
  '#10b981', // 翠绿
  '#f59e0b', // 琥珀
  '#ec4899', // 玫红
  '#8b5cf6', // 紫
  '#06b6d4'  // 青
]

/** 随机取一个任务颜色 */
export function randomTaskColor(): string {
  return TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)]
}
