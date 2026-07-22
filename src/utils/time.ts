// 时间格式化工具

/**
 * 将时间戳格式化为相对时间字符串。
 * 规则：刚刚 / X分钟前 / X小时前 / 昨天 / X天前 / M月D日 / YYYY年M月D日
 */
export function formatRelative(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 0) return '刚刚'
  const min = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  const date = new Date(ts)
  const nowDate = new Date(now)
  const yesterday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate() - 1
  )
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return '昨天'
  }
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`
  if (date.getFullYear() === nowDate.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 将时间戳格式化为完整的日期时间字符串。
 * 例如：2026年7月23日 14:30
 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}年${m}月${day}日 ${hh}:${mm}`
}

/**
 * 获取当前日期的 YYYY-MM-DD 字符串。
 */
export function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 将时间戳转为 YYYY-MM-DD（按本地时区）。
 */
export function tsToDateStr(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
