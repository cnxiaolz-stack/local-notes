<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SideNav from '@/components/SideNav.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import DatePickerButton from '@/components/common/DatePickerButton.vue'
import { navItems } from '@/components/navItems'
import { useAppStore } from '@/stores/app'
import { isTauri } from '@/utils/backup'
import { getCurrentWindow } from '@tauri-apps/api/window'

const route = useRoute()
const app = useAppStore()

/** 是否在 Tauri 桌面端环境（PWA 端隐藏置顶按钮） */
const isDesktop = isTauri()

const pageTitle = computed(() => {
  const meta = route.meta?.title
  if (typeof meta === 'string' && meta) return meta
  const found = navItems.find((item) => item.to === route.path)
  return found?.title ?? '轻记'
})

// 今日/便签/日记三页显示全局日历按钮（任务按日期过滤、便签按日期滚动定位、日记按日期编辑）
const showDatePicker = computed(() =>
  ['today', 'notes', 'diary'].includes(String(route.name ?? ''))
)

// 今日/日记两页显示「全部」按钮（便签默认常显全部，无需此按钮）
const showAllListBtn = computed(() =>
  ['today', 'diary'].includes(String(route.name ?? ''))
)

// 切换页面自动收起「全部列表」
watch(
  () => route.fullPath,
  () => {
    app.setAllList(false)
  }
)

/** 切换窗口置顶 */
async function togglePin(): Promise<void> {
  app.toggleAlwaysOnTop()
  try {
    await getCurrentWindow().setAlwaysOnTop(app.alwaysOnTop)
  } catch (err) {
    console.error('[qingji] 设置置顶失败：', err)
  }
}

// 启动时恢复置顶状态
onMounted(async () => {
  if (isDesktop && app.alwaysOnTop) {
    try {
      await getCurrentWindow().setAlwaysOnTop(true)
    } catch (err) {
      console.error('[qingji] 恢复置顶失败：', err)
    }
  }
})
</script>

<template>
  <div class="flex h-full">
    <SideNav />

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="app-header">
        <h1 class="text-xl font-semibold" style="color: var(--color-text-primary)">
          {{ pageTitle }}
        </h1>
        <div class="header-actions">
          <button
            v-if="isDesktop"
            type="button"
            class="pin-btn"
            :class="{ active: app.alwaysOnTop }"
            :title="app.alwaysOnTop ? '取消置顶' : '窗口置顶'"
            @click="togglePin"
          >
            <AppIcon name="pin" :size="18" />
          </button>
          <DatePickerButton v-if="showDatePicker" />
          <button
            v-if="showAllListBtn"
            type="button"
            class="all-list-btn"
            :class="{ 'is-active': app.showAllList }"
            :aria-pressed="app.showAllList"
            @click="app.toggleAllList()"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>全部</span>
          </button>
        </div>
      </header>

      <main class="app-main">
        <RouterView />
      </main>
    </div>

    <BottomTabBar />
  </div>
</template>

<style scoped>
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.all-list-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 0.625rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease, background-color 200ms ease;
}
.all-list-btn:hover {
  border-color: var(--color-brand);
  color: var(--color-text-primary);
}
.all-list-btn.is-active {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background-color: var(--color-brand-soft);
}

.pin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.625rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease, background-color 200ms ease;
}
.pin-btn:hover {
  border-color: var(--color-brand);
  color: var(--color-text-primary);
}
.pin-btn.active {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background-color: var(--color-brand-soft);
}
</style>
