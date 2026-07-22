import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 应用主题：6 套预设
 *   minimal   纯白极简（Notion 风）
 *   paper     暖纸书卷
 *   ink       墨黑沉静（深色）
 *   mint      清新薄荷
 *   morandi   莫兰迪灰调
 *   sunlit    暖阳橙白
 */
export type AppTheme = 'minimal' | 'paper' | 'ink' | 'mint' | 'morandi' | 'sunlit'

export const THEME_LIST: AppTheme[] = ['minimal', 'paper', 'ink', 'mint', 'morandi', 'sunlit']

const THEME_LABELS: Record<AppTheme, string> = {
  minimal: '纯白极简',
  paper: '暖纸书卷',
  ink: '墨黑沉静',
  mint: '清新薄荷',
  morandi: '莫兰迪灰调',
  sunlit: '暖阳橙白'
}

const STORAGE_KEY = 'qingji-theme'

function isAppTheme(value: string | null): value is AppTheme {
  return value !== null && THEME_LIST.includes(value as AppTheme)
}

function applyThemeToDom(theme: AppTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  // 切换时加过渡类，让颜色变化更顺滑
  root.classList.add('theme-transition')
  root.setAttribute('data-theme', theme)
  // 过渡结束后移除（避免持续影响非颜色相关过渡）
  window.setTimeout(() => root.classList.remove('theme-transition'), 320)
}

/**
 * 应用级状态：管理页面主题（6 套预设，持久化到 localStorage）。
 */
export const useAppStore = defineStore('app', () => {
  const theme = ref<AppTheme>('minimal')

  /** 切换主题：写入 localStorage 并同步到 <html data-theme>。 */
  function setTheme(next: AppTheme): void {
    theme.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* localStorage 不可用时静默降级 */
    }
    applyThemeToDom(next)
  }

  /** 应用启动时调用：读取用户偏好并应用。 */
  function initTheme(): void {
    let saved: AppTheme = 'minimal'
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (isAppTheme(raw)) saved = raw
    } catch {
      /* ignore */
    }
    theme.value = saved
    applyThemeToDom(saved)
  }

  /** 获取主题中文名（用于 UI 显示） */
  function themeLabel(t: AppTheme = theme.value): string {
    return THEME_LABELS[t] ?? t
  }

  return { theme, THEME_LIST, setTheme, initTheme, themeLabel }
})
