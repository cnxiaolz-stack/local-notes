<script setup lang="ts">
// 日记主视图：左侧列表（按月分组）+ 右侧编辑区。
// 日期切换由全局 header 的日历按钮驱动（app.selectedDate），本页不再自带日历。
import { onMounted, ref, watch } from 'vue'
import { useDiaryStore } from '@/stores/diary'
import { useAppStore } from '@/stores/app'
import { getStorage } from '@/utils/storage'
import type { Diary } from '@/types'
import DiaryList from '@/components/diary/DiaryList.vue'
import DiaryEditor from '@/components/diary/DiaryEditor.vue'

const diaryStore = useDiaryStore()
const app = useAppStore()

/** 当前编辑区内容镜像（来自 store.currentDiary，无则为空串） */
const diaryContent = ref<string>('')
/** 切换日期时的加载态（也用于首次挂载，触发旧编辑器卸载并 flushSave） */
const isLoading = ref<boolean>(true)
/** 全部日记（用于列表视图的内容预览） */
const allDiaries = ref<Diary[]>([])
/** 移动端抽屉是否打开 */
const isSidebarOpen = ref<boolean>(false)

async function refreshAllDiaries(): Promise<void> {
  allDiaries.value = await getStorage().getAllDiaries()
}

/** 按全局选中日期加载日记 */
async function loadDate(date: string): Promise<void> {
  isLoading.value = true
  isSidebarOpen.value = false
  try {
    await diaryStore.loadDiary(date)
    diaryContent.value = diaryStore.currentDiary?.content ?? ''
  } catch (err) {
    console.error('[qingji] 加载日记失败：', err)
    diaryContent.value = ''
  } finally {
    isLoading.value = false
  }
}

function handleSelect(date: string): void {
  app.setSelectedDate(date)
}

function openSidebar(): void {
  isSidebarOpen.value = true
}

// 全局选中日期变化 → 重新加载该日日记
watch(
  () => app.selectedDate,
  (val) => {
    void loadDate(val)
  }
)

// 日记日期集合变化 → 同步全局日历的标记日期，并刷新列表（处理新增/删除）
watch(
  () => diaryStore.diaryDates,
  (dates) => {
    app.setMarkedDates(dates)
    void refreshAllDiaries()
  }
)

// store.currentDiary 变化时同步本地列表预览
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
  }
  app.setMarkedDates(diaryStore.diaryDates)
  await loadDate(app.selectedDate)
})
</script>

<template>
  <section class="diary-view">
    <!-- 移动端：打开列表抽屉的按钮 -->
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
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
      <span>列表</span>
    </button>

    <div class="diary-layout">
      <!-- 侧栏：桌面端常驻，移动端为滑入抽屉，仅展示日记列表 -->
      <aside
        class="diary-sidebar"
        :class="{ 'is-open': isSidebarOpen }"
      >
        <div class="sidebar-body">
          <DiaryList
            :diaries="allDiaries"
            :selected-date="app.selectedDate"
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
          :key="app.selectedDate"
          :date="app.selectedDate"
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
  background-color: var(--color-surface-strong);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
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
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
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
