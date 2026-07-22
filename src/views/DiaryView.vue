<script setup lang="ts">
// 日记主视图：列表（按月分组，滚动加载）+ 编辑区（绑定全局 selectedDate）。
// 日期切换由全局 header 的日历按钮驱动（app.selectedDate）。
// 移动端为上下结构（列表在上限高滚动，编辑器在下），桌面端为左右分栏。
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDiaryStore } from '@/stores/diary'
import { useAppStore } from '@/stores/app'
import DiaryList from '@/components/diary/DiaryList.vue'
import DiaryEditor from '@/components/diary/DiaryEditor.vue'

const diaryStore = useDiaryStore()
const app = useAppStore()

/** 当前编辑区内容镜像（来自 store.currentDiary，无则为空串） */
const diaryContent = ref<string>('')
/** 切换日期时的加载态（也用于首次挂载，触发旧编辑器卸载并 flushSave） */
const isLoading = ref<boolean>(true)

/** 滚动加载：列表侧栏为独立滚动容器，sentinel 进入可视区触发加载 */
const sidebarEl = ref<HTMLElement | null>(null)
const sentinelEl = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

/** 按全局选中日期加载日记 */
async function loadDate(date: string): Promise<void> {
  isLoading.value = true
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

function setupObserver(): void {
  if (!sentinelEl.value || !sidebarEl.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        diaryStore.diariesHasMore &&
        !diaryStore.diariesLoading
      ) {
        void diaryStore.loadDiariesPage()
      }
    },
    { root: sidebarEl.value, rootMargin: '100px' }
  )
  observer.observe(sentinelEl.value)
}

// 全局选中日期变化 → 重新加载该日日记
watch(
  () => app.selectedDate,
  (val) => {
    void loadDate(val)
  }
)

// 日记日期集合变化 → 同步全局日历标记 + 重置分页列表（覆盖保存/删除后的刷新）
watch(
  () => diaryStore.diaryDates,
  (dates) => {
    app.setMarkedDates(dates)
    void diaryStore.loadDiariesPage(true)
  }
)

onMounted(async () => {
  try {
    await diaryStore.loadDiaryDates() // 触发上方 watch → setMarkedDates + loadDiariesPage(true) 首次加载列表
  } catch (err) {
    console.error('[qingji] 日记数据加载失败：', err)
  }
  await loadDate(app.selectedDate)
  nextTick(() => setupObserver())
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section class="diary-view">
    <div class="diary-layout">
      <!-- 侧栏：日记列表（滚动加载），桌面常驻左侧，移动端顶部限高滚动 -->
      <aside ref="sidebarEl" class="diary-sidebar">
        <div class="sidebar-body">
          <DiaryList
            :diaries="diaryStore.pagedDiaries"
            :selected-date="app.selectedDate"
            @select="handleSelect"
          />
        </div>
        <!-- 滚动加载哨兵 -->
        <div ref="sentinelEl" class="sentinel" aria-hidden="true"></div>
        <div v-if="diaryStore.diariesLoading" class="load-hint">加载中…</div>
        <div
          v-else-if="!diaryStore.diariesHasMore && diaryStore.pagedDiaries.length > 0"
          class="load-hint"
        >
          没有更多了
        </div>
      </aside>

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
}

.diary-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (min-width: 768px) {
  .diary-layout {
    flex-direction: row;
    align-items: flex-start;
  }
}

/* 侧栏：独立滚动容器，桌面左 320px，移动端顶部限高 */
.diary-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-height: 40vh;
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
@media (min-width: 768px) {
  .diary-sidebar {
    width: 320px;
    flex-shrink: 0;
    max-width: none;
    max-height: calc(100vh - 8rem);
    position: sticky;
    top: 1rem;
  }
}

.sidebar-body {
  flex: 1 1 auto;
  min-height: 0;
}

.sentinel {
  height: 1px;
  width: 100%;
  flex-shrink: 0;
}

.load-hint {
  text-align: center;
  padding: 0.5rem 0;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
  flex-shrink: 0;
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
