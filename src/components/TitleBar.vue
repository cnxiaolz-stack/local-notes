<script setup lang="ts">
// 自定义窗口标题栏：替代系统标题栏，包含 置顶/最小化/最大化/关闭 四个按钮。
// 整个标题栏为拖拽区域（按钮除外），可拖动移动窗口；双击标题栏切换最大化。
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useAppStore } from '@/stores/app'

const app = useAppStore()

/** 当前窗口是否最大化（用于切换最大化按钮图标） */
const isMaximized = ref(false)

let win: Awaited<ReturnType<typeof import('@tauri-apps/api/window')['getCurrentWindow']>> | null = null
let unlisten: (() => void) | null = null

/** 切换窗口置顶 */
async function togglePin(): Promise<void> {
  app.toggleAlwaysOnTop()
  try {
    if (!win) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      win = getCurrentWindow()
    }
    await win.setAlwaysOnTop(app.alwaysOnTop)
  } catch (err) {
    console.error('[qingji] 设置置顶失败：', err)
  }
}

/** 最小化 */
async function minimize(): Promise<void> {
  try {
    if (!win) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      win = getCurrentWindow()
    }
    await win.minimize()
  } catch (err) {
    console.error('[qingji] 最小化失败：', err)
  }
}

/** 切换最大化/还原 */
async function toggleMaximize(): Promise<void> {
  try {
    if (!win) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      win = getCurrentWindow()
    }
    await win.toggleMaximize()
  } catch (err) {
    console.error('[qingji] 切换最大化失败：', err)
  }
}

/** 关闭窗口 */
async function closeWin(): Promise<void> {
  try {
    if (!win) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      win = getCurrentWindow()
    }
    await win.close()
  } catch (err) {
    console.error('[qingji] 关闭失败：', err)
  }
}

onMounted(async () => {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    win = getCurrentWindow()
    // 恢复置顶状态
    if (app.alwaysOnTop) {
      await win.setAlwaysOnTop(true)
    }
    // 读取当前最大化状态
    isMaximized.value = await win.isMaximized()
    // 监听最大化状态变化，同步按钮图标
    unlisten = await win.onResized(async () => {
      try {
        isMaximized.value = await win!.isMaximized()
      } catch {
        /* 忽略 */
      }
    })
  } catch (err) {
    console.error('[qingji] 标题栏初始化失败：', err)
  }
})

onBeforeUnmount(() => {
  unlisten?.()
})
</script>

<template>
  <div class="titlebar" data-tauri-drag-region>
    <!-- 左侧：应用标识 -->
    <div class="titlebar-left" data-tauri-drag-region>
      <span class="titlebar-logo">轻</span>
      <span class="titlebar-name">轻记</span>
    </div>

    <!-- 右侧：窗口控制按钮 -->
    <div class="titlebar-controls">
      <!-- 置顶 -->
      <button
        type="button"
        class="titlebar-btn pin"
        :class="{ active: app.alwaysOnTop }"
        :title="app.alwaysOnTop ? '取消置顶' : '窗口置顶'"
        @click="togglePin"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 4h6v6l3 4H6l3-4V4z" />
          <line x1="12" y1="14" x2="12" y2="20" />
        </svg>
      </button>
      <!-- 最小化 -->
      <button
        type="button"
        class="titlebar-btn"
        title="最小化"
        @click="minimize"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
      </button>
      <!-- 最大化/还原 -->
      <button
        type="button"
        class="titlebar-btn"
        :title="isMaximized ? '向下还原' : '最大化'"
        @click="toggleMaximize"
      >
        <svg v-if="!isMaximized" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="3" width="10" height="10" rx="1" />
        </svg>
        <svg v-else viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="5" width="8" height="8" rx="1" />
          <path d="M5 5V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1" />
        </svg>
      </button>
      <!-- 关闭 -->
      <button
        type="button"
        class="titlebar-btn close"
        title="关闭"
        @click="closeWin"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <line x1="4" y1="4" x2="12" y2="12" />
          <line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  flex-shrink: 0;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border-subtle);
  user-select: none;
  -webkit-user-select: none;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 0.75rem;
  height: 100%;
}

.titlebar-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.3rem;
  background-color: var(--color-brand);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
}

.titlebar-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.titlebar-controls {
  display: flex;
  align-items: stretch;
  height: 100%;
}

.titlebar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  border: none;
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.titlebar-btn:hover {
  background-color: var(--color-bg-soft);
  color: var(--color-text-primary);
}

.titlebar-btn.pin.active {
  color: var(--color-brand);
}

.titlebar-btn.pin.active:hover {
  background-color: var(--color-brand-soft);
}

.titlebar-btn.close:hover {
  background-color: #e81123;
  color: #fff;
}
</style>
