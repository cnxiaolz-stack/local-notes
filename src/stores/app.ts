import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'qingji-theme'

function readSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

/**
 * 应用级状态：管理深浅色主题（支持跟随系统）。
 */
export const useAppStore = defineStore('app', () => {
  const theme = ref<ThemeMode>('system')
  const resolvedTheme = ref<'light' | 'dark'>('light')

  let mql: MediaQueryList | null = null
  let mqlListener: ((event: MediaQueryListEvent) => void) | null = null

  function applyDarkClass(mode: 'light' | 'dark'): void {
    const root = document.documentElement
    if (mode === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }

  function resolve(): void {
    const next = theme.value === 'system' ? readSystemTheme() : theme.value
    resolvedTheme.value = next
    applyDarkClass(next)
  }

  function detachMediaListener(): void {
    if (mql && mqlListener) {
      mql.removeEventListener('change', mqlListener)
    }
    mql = null
    mqlListener = null
  }

  function attachMediaListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return
    detachMediaListener()
    mql = window.matchMedia('(prefers-color-scheme: dark)')
    mqlListener = (event: MediaQueryListEvent) => {
      if (theme.value !== 'system') return
      const next = event.matches ? 'dark' : 'light'
      resolvedTheme.value = next
      applyDarkClass(next)
    }
    mql.addEventListener('change', mqlListener)
  }

  /** 切换主题：写入 localStorage 并同步到 <html> 的 dark class。 */
  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* localStorage 不可用时静默降级 */
    }
    resolve()
    if (mode === 'system') attachMediaListener()
    else detachMediaListener()
  }

  /** 应用启动时调用：读取用户偏好并应用，必要时监听系统主题变化。 */
  function initTheme(): void {
    let saved: ThemeMode = 'system'
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (isThemeMode(raw)) saved = raw
    } catch {
      /* ignore */
    }
    theme.value = saved
    resolve()
    if (saved === 'system') attachMediaListener()
  }

  return { theme, resolvedTheme, initTheme, setTheme }
})
