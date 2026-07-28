/**
 * 统一的 Tauri 桌面端环境检测。
 *
 * 以 `__TAURI_INTERNALS__` 为准（Tauri 运行时在页面脚本前注入），
 * 与 storage/backup 的检测保持一致，避免不同模块用不同标识导致判定分歧。
 */
export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
