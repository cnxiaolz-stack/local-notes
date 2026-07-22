<script setup lang="ts">
// 日记主视图：左侧日历/列表 + 右侧编辑区
import { onMounted, ref, watch } from 'vue'
import { useDiaryStore } from '@/stores/diary'
import { getStorage } from '@/utils/storage'
import type { Diary } from '@/types'
import Calendar from '@/components/diary/Calendar.vue'
import DiaryList from '@/components/diary/DiaryList.vue'
import DiaryEditor from '@/components/diary/DiaryEditor.vue'

const diaryStore = useDiaryStore()

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 当前编辑的日期（YYYY-MM-DD），默认今日 */
const selectedDate = ref<string>(todayStr())
/** 当前编辑区内容镜像（来自 store.currentDiary，无则为空串） */
const diaryContent = ref<string>('')
/** 切换日期时的加载态（也用于首次挂载） */
const isLoading = ref<boolean>(true)
/** 全部日记（用于列表视图的内容预览） */
const allDiaries = ref<Diary[]>([])
/** 侧栏视图：日历 / 列表 */
const sidebarMode = ref<'calendar' | 'list'>('calendar')
/** 移动端抽屉是否打开 */
const isSidebarOpen = ref<boolean>(false)

async function refreshAllDiaries(): Promise<void> {
  allDiaries.value = await getStorage().getAllDiaries()
}

/** 切换到指定日期：先把编辑区置为加载态（触发旧编辑器卸载并 flushSave），再加载新日记 */
async function selectDate(date: string): Promise<void> {
  if (date === selectedDate.value && !isLoading.value) return
  isLoading.value = true
  isSidebarOpen.value = false
  try {
    await diaryStore.loadDiary(date)
    diaryContent.value = diaryStore.currentDiary?.content ?? ''
    selectedDate.value = date
  } catch (err) {
    console.error('[qingji] 加载日记失败：', err)
    diaryContent.value = ''
    selectedDate.value = date
  } finally {
    isLoading.value = false
  }
}

function handleSelect(date: string): void {
  void selectDate(date)
}

function openSidebar(): void {
  isSidebarOpen.value = true
}

/**
 * 监听 store.currentDiary 变化，同步更新本地 allDiaries：
 * - 保存时：让列表预览显示最新内容
 * - 加载时：若该日期已存在则相当于无操作
 */
watch(
  () => diaryStore.currentDiary,
  (newDiary) => {
    if (!newDiary) return
    const idx = allDiaries.value.findIndex((d) => d.date === newDiary.date)
    if (idx >= 0) {
      allDiaries.value[idx] = newDiary
    } else {
      allDiaries.value.push(newDiary)
    }
  }
)

onMounted(async () => {
  try {
    await Promise.all([diaryStore.loadDiaryDates(), refreshAllDiaries()])
  } catch (err) {
    console.error('[qingji] 日记数据加载失败：', err)
  } finally {
    await selectDate(todayStr())
  }
})
</script>

<template>
  <section class="diary-view">
    <!-- 移动端：打开日历/列表抽屉的按钮 -->
    <button
      type="button"
      class="diary-mobile-toggle md:hidden"
      @click="openSidebar"
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
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span>{{ sidebarMode === 'calendar' ? '日历' : '列表' }}</span>
    </button>

    <div class="diary-layout">
      <!-- 侧栏：桌面端常驻，移动端为滑入抽屉 -->
      <aside
        class="diary-sidebar"
        :class="{ 'is-open': isSidebarOpen }"
      >
        <div class="sidebar-tabs">
          <button
            type="button"
            class="sidebar-tab"
            :class="{ 'is-active': sidebarMode === 'calendar' }"
            @click="sidebarMode = 'calendar'"
          >
            日历
          </button>
          <button
            type="button"
            class="sidebar-tab"
            :class="{ 'is-active': sidebarMode === 'list' }"
            @click="sidebarMode = 'list'"
          >
            列表
          </button>
        </div>
        <div class="sidebar-body">
          <Calendar
            v-if="sidebarMode === 'calendar'"
            :diary-dates="diaryStore.diaryDates"
            :selected-date="selectedDate"
            @select="handleSelect"
          />
          <DiaryList
            v-else
            :diaries="allDiaries"
            :selected-date="selectedDate"
            @select="handleSelect"
          />
        </div>
      </aside>

      <!-- 移动端抽屉背景 -->
      <Transition name="fade">
        <div
          v-if="isSidebarOpen"
          class="diary-backdrop md:hidden"
          @click="isSidebarOpen = false"
        ></div>
      </Transition>

      <!-- 编辑区 -->
      <div class="diary-main">
        <DiaryEditor
          v-if="!isLoading"
          :key="selectedDate"
          :date="selectedDate"
          :initial-content="diaryContent"
        />
        <div v-else class="diary-loading">
          <span class="loading-spinner" aria-hidden="true"></span>
          <span>加载中…</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.diary-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.diary-mobile-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  min-height: 36px;
  padding: 0 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 200ms ease, border-color 200ms ease,
    background-color 200ms ease;
}
.diary-mobile-toggle:hover {
  color: var(--color-text-primary);
  border-color: var(--color-brand);
}
.diary-mobile-toggle:active {
  transform: scale(0.97);
}

.diary-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
@media (min-width: 768px) {
  .diary-layout {
    flex-direction: row;
    align-items: flex-start;
  }
}

/* 侧栏：移动端为滑入抽屉，桌面端为常驻卡片 */
.diary-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 320px;
  max-width: 85vw;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  transform: translateX(-100%);
  transition: transform 200ms ease;
  z-index: 40;
  overflow-y: auto;
  padding: 1rem;
  padding-top: calc(1rem + env(safe-area-inset-top));
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}
.diary-sidebar.is-open {
  transform: translateX(0);
}
@media (min-width: 768px) {
  .diary-sidebar {
    position: static;
    transform: none;
    width: 320px;
    flex-shrink: 0;
    max-width: none;
    border-right: none;
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    max-height: calc(100vh - 8rem);
    padding: 1rem;
  }
}

.sidebar-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background-color: var(--color-bg);
  border-radius: 0.5rem;
  flex-shrink: 0;
}
.sidebar-tab {
  flex: 1 1 0%;
  min-height: 32px;
  padding: 0 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease;
}
.sidebar-tab:hover {
  color: var(--color-text-primary);
}
.sidebar-tab.is-active {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.sidebar-body {
  flex: 1 1 auto;
  min-height: 0;
}

.diary-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 35;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.diary-main {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.diary-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  min-height: 60vh;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
}
.loading-spinner {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-brand);
  animation: diary-spin 0.8s linear infinite;
}
@keyframes diary-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 768px) {
  .diary-loading {
    min-height: calc(100vh - 220px);
  }
}
</style>
