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
  '#10b981', // 绿
  '#9ca3af', // 灰
  '#fcd34d', // 黄
  '#06b6d4'  // 青
]

/**
 * 旧色板颜色 → 新色板的映射。
 * 用于把历史上用旧色板创建的任务（红/玫红/紫/琥珀/天蓝）迁移到当前 5 色板，
 * 确保界面不再出现用户不喜欢的颜色。映射目标尽量贴近原色相：
 *   琥珀(#f59e0b) → 黄(#fcd34d)
 *   玫红(#ec4899) → 红 → 蓝（色板无红，映射到主色蓝）
 *   紫  (#8b5cf6) → 蓝(#3b82f6)
 *   天蓝(#0ea5e9) → 蓝(#3b82f6)（青系合并到蓝）
 */
export const LEGACY_COLOR_MAP: Record<string, string> = {
  '#f59e0b': '#fcd34d', // 琥珀 → 黄
  '#ec4899': '#3b82f6', // 玫红 → 蓝
  '#8b5cf6': '#3b82f6', // 紫 → 蓝
  '#0ea5e9': '#3b82f6'  // 天蓝 → 蓝
}

/** 随机取一个任务颜色 */
export function randomTaskColor(): string {
  return TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)]
}

/**
 * 任务颜色归一化（渲染层兜底）：
 * - 无颜色 → 回退品牌蓝
 * - 旧色板遗留色 → 按 LEGACY_COLOR_MAP 映射到当前色板
 * - 非法/未知色 → 回退品牌蓝
 * - 当前色板内的色 → 原样返回
 *
 * 即便数据层迁移有遗漏，显示层也 guaranteed 不会出现红/紫/天蓝等遗留色。
 */
export function normalizeTaskColor(color?: string | null): string {
  if (!color) return 'var(--color-brand)'
  if (LEGACY_COLOR_MAP[color]) return LEGACY_COLOR_MAP[color]
  return TASK_COLORS.includes(color) ? color : 'var(--color-brand)'
}
