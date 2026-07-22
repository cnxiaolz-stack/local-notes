// 数据导出/备份/导入工具：JSON / Markdown / 恢复
//
// 桌面端（Tauri）使用 plugin-dialog + plugin-fs；
// PWA 端（浏览器）使用 Blob 下载与隐藏 <input type="file"> 上传。
// 通过 isTauri() 在运行时分流，动态 import 避免把 Tauri 插件打进 PWA 包。
import type { BackupData, Diary, Note, Task } from '@/types'
import { getStorage } from '@/utils/storage'

// ============================================================
// SubTask 7.4：辅助函数
// ============================================================

/**
 * 判断当前是否运行在 Tauri 桌面端环境。
 * 与 storage.ts 中的检测方式保持一致。
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 格式化日期为 YYYY-MM-DD（本地时区），用于文件名。
 */
export function formatDateForFilename(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 格式化时间戳为 YYYY-MM-DD HH:mm（本地时区） */
function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

/**
 * 校验文件内容字符串是否为合法的 BackupData。
 * - 必须能被 JSON.parse
 * - 必须含数字 version 字段
 * - tasks / notes / diaries 必须是数组
 *
 * 供 UI 层在"二次确认"对话框弹出前先做预校验：
 *   const data = parseBackupFile(content)
 *   if (!data) { 提示格式无效; return }
 *   if (!confirm(`将覆盖现有数据，确定？`)) return
 *   await importJSON()  // 或直接调用 storage.replaceAllData(data)
 */
export function parseBackupFile(fileContent: string): BackupData | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(fileContent)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const data = parsed as Record<string, unknown>
  if (
    typeof data.version !== 'number' ||
    !Array.isArray(data.tasks) ||
    !Array.isArray(data.notes) ||
    !Array.isArray(data.diaries)
  ) {
    return null
  }
  return {
    version: data.version,
    // 旧版备份可能没有 exported_at，导入时用当前时间兜底
    exported_at:
      typeof data.exported_at === 'number' ? data.exported_at : Date.now(),
    tasks: data.tasks as Task[],
    notes: data.notes as Note[],
    diaries: data.diaries as Diary[]
  }
}

// ============================================================
// 桌面端（Tauri）文件读写封装
// ============================================================

/**
 * 桌面端：弹出 Tauri 保存对话框，用户选好路径后写入文本文件。
 * @returns true 表示已写入；false 表示用户取消了对话框
 */
async function tauriSaveTextFile(
  filename: string,
  content: string,
  ext: 'json' | 'md'
): Promise<boolean> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')
  const filterName = ext === 'json' ? 'JSON' : 'Markdown'
  const filePath = await save({
    defaultPath: filename,
    filters: [{ name: filterName, extensions: [ext] }]
  })
  if (!filePath) return false
  await writeTextFile(filePath, content)
  return true
}

/**
 * 桌面端：弹出 Tauri 打开对话框，用户选好文件后读取文本内容。
 * @returns 文件内容字符串；用户取消时返回 null
 */
async function tauriOpenTextFile(ext: 'json' | 'md'): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const filterName = ext === 'json' ? 'JSON' : 'Markdown'
  const filePath = await open({
    filters: [{ name: filterName, extensions: [ext] }],
    multiple: false
  })
  if (!filePath || Array.isArray(filePath)) return null
  return await readTextFile(filePath)
}

// ============================================================
// PWA 端（浏览器）下载/上传封装
// ============================================================

/**
 * PWA 端：通过 Blob + URL.createObjectURL + <a download> 触发浏览器下载。
 */
function browserDownload(
  filename: string,
  content: string,
  mime: string
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 释放对象 URL（下一个事件循环）
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * PWA 端：通过隐藏的 <input type="file"> 触发文件选择并读取文本内容。
 * 用户取消时 resolve(null)（通过窗口重新获得焦点兜底检测取消）。
 */
function browserPickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.style.opacity = '0'

    let done = false
    const cleanup = () => {
      window.removeEventListener('focus', onFocus)
      if (input.parentNode) document.body.removeChild(input)
    }
    const settle = (value: string | null) => {
      if (done) return
      done = true
      cleanup()
      resolve(value)
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        settle(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () =>
        settle(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => settle(null)
      reader.readAsText(file)
    })

    // 用户取消时浏览器不会触发 change 事件，用窗口重新获得焦点兜底
    const onFocus = () => {
      setTimeout(() => {
        if (!done && (!input.files || input.files.length === 0)) {
          settle(null)
        }
      }, 300)
    }
    window.addEventListener('focus', onFocus)

    document.body.appendChild(input)
    input.click()
  })
}

// ============================================================
// SubTask 7.1：导出全部数据为 JSON
// ============================================================

/**
 * 导出全部数据为 JSON 文件（文件名含日期）。
 * - 桌面端：弹出 Tauri 保存对话框，用户选择位置后写入
 * - PWA 端：直接触发浏览器下载
 *
 * 用户取消保存对话框时静默返回（不抛错）。
 */
export async function exportJSON(): Promise<void> {
  const data = await getStorage().getAllData()
  const backup: BackupData = {
    version: 1,
    exported_at: Date.now(),
    tasks: data.tasks,
    notes: data.notes,
    diaries: data.diaries
  }
  const json = JSON.stringify(backup, null, 2)
  const filename = `qingji-backup-${formatDateForFilename()}.json`

  if (isTauri()) {
    await tauriSaveTextFile(filename, json, 'json')
  } else {
    browserDownload(filename, json, 'application/json')
  }
}

// ============================================================
// SubTask 7.2：导出为 Markdown（按模块组织）
// ============================================================

/** 转义 Markdown 行内特殊字符（用于任务内容等行内文本） */
function escapeMarkdownInline(text: string): string {
  return text.replace(/[\\`*_\[\]]/g, '\\$&')
}

/** 转义标题中的 # 字符，避免破坏标题层级 */
function escapeMarkdownHeading(text: string): string {
  return text.replace(/#/g, '\\#')
}

/** 转义段落行首的 # 防止被识别为标题（多行模式） */
function escapeMarkdownParagraph(text: string): string {
  return text.replace(/^#{1,6}(\s|$)/gm, '\\#$1')
}

/** 生成 Markdown 备份文本 */
function generateMarkdown(data: BackupData, dateStr: string): string {
  const lines: string[] = []
  lines.push(`# 轻记数据备份 - ${dateStr}`)
  lines.push('')

  // ---------- 任务清单 ----------
  lines.push('## 任务清单')
  const tasksByDate = new Map<string, Task[]>()
  for (const t of data.tasks) {
    const arr = tasksByDate.get(t.date)
    if (arr) arr.push(t)
    else tasksByDate.set(t.date, [t])
  }
  // 按日期倒序
  const sortedTaskDates = Array.from(tasksByDate.keys()).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0
  )
  for (const date of sortedTaskDates) {
    lines.push(`### ${date}`)
    const tasks = (tasksByDate.get(date) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
    for (const t of tasks) {
      const checkbox = t.completed ? '[x]' : '[ ]'
      const content = escapeMarkdownInline(t.content ?? '')
      lines.push(`- ${checkbox} ${content}`)
    }
    lines.push('')
  }

  // ---------- 便签 ----------
  lines.push('## 便签')
  const sortedNotes = data.notes
    .slice()
    .sort((a, b) => b.updated_at - a.updated_at)
  for (const n of sortedNotes) {
    const rawTitle = (n.title ?? '').trim()
    const title = rawTitle ? escapeMarkdownHeading(rawTitle) : '无标题'
    lines.push(`### ${title}`)
    lines.push('')
    const rawContent = (n.content ?? '').trim()
    if (rawContent) {
      // 引用块形式呈现；按 spec 引用块中可忽略特殊字符转义
      const quoteLines = rawContent.split('\n').map((l) => `> ${l}`)
      lines.push(...quoteLines)
      lines.push('')
    }
    lines.push(`创建时间：${formatTimestamp(n.created_at)}`)
    lines.push('')
  }

  // ---------- 日记 ----------
  lines.push('## 日记')
  const sortedDiaries = data.diaries
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  for (const d of sortedDiaries) {
    lines.push(`### ${d.date}`)
    const content = (d.content ?? '').trim()
    if (content) {
      lines.push(escapeMarkdownParagraph(content))
    }
    lines.push('')
  }

  // 折叠多余空行 + 收尾保证单个换行
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

/**
 * 导出全部数据为 Markdown 文件（按模块组织）。
 * - 桌面端：弹出 Tauri 保存对话框
 * - PWA 端：触发浏览器下载
 *
 * 用户取消保存对话框时静默返回（不抛错）。
 */
export async function exportMarkdown(): Promise<void> {
  const data = await getStorage().getAllData()
  const dateStr = formatDateForFilename()
  const md = generateMarkdown(data, dateStr)
  const filename = `qingji-backup-${dateStr}.md`

  if (isTauri()) {
    await tauriSaveTextFile(filename, md, 'md')
  } else {
    browserDownload(filename, md, 'text/markdown')
  }
}

// ============================================================
// SubTask 7.3：从 JSON 文件导入恢复（覆盖模式）
// ============================================================

export interface ImportResult {
  success: boolean
  message: string
}

/**
 * 从 JSON 文件导入并覆盖当前数据。
 *
 * 流程：
 * 1. 桌面端用 Tauri 打开对话框，PWA 端用隐藏 <input type="file">
 * 2. 读取文件内容并调用 parseBackupFile 校验
 * 3. 调用 getStorage().replaceAllData(data) 执行覆盖式写入
 *
 * 注意：本函数执行"覆盖模式"导入（清空后写入）。
 * 二次确认由调用方（UI 层）负责；建议先用 parseBackupFile 预校验。
 *
 * @returns { success, message } 供 UI 显示提示
 */
export async function importJSON(): Promise<ImportResult> {
  let fileContent: string | null = null

  try {
    if (isTauri()) {
      fileContent = await tauriOpenTextFile('json')
    } else {
      fileContent = await browserPickTextFile('.json')
    }
  } catch (err) {
    return {
      success: false,
      message: `读取文件失败：${err instanceof Error ? err.message : String(err)}`
    }
  }

  if (fileContent === null) {
    return { success: false, message: '已取消选择文件' }
  }

  const data = parseBackupFile(fileContent)
  if (!data) {
    return {
      success: false,
      message: '文件格式无效或已损坏：缺少必要字段（version/tasks/notes/diaries）'
    }
  }

  try {
    await getStorage().replaceAllData(data)
  } catch (err) {
    return {
      success: false,
      message: `写入数据失败：${err instanceof Error ? err.message : String(err)}`
    }
  }

  return {
    success: true,
    message: `导入成功：${data.tasks.length} 项任务、${data.notes.length} 篇便签、${data.diaries.length} 篇日记`
  }
}
