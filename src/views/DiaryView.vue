<script setup lang="ts">
// 日记主视图：纵向布局——上方当天日记输入框，下方按需展开历史日记列表。
// 日期切换由全局 header 的日历按钮驱动（app.selectedDate）。
// 点 header「全部」按钮（app.showAllList）在下方展开全部历史日记（按月分组，滚动加载）。
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

/** 滚动加载哨兵 */
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
  if (!sentinelEl.value || typeof IntersectionObserver === 'undefined') return
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
    { root: null, rootMargin: '200px' }
  )
  observer.observe(sentinelEl.value)
}

function teardownObserver(): void {
  observer?.disconnect()
  observer = null
}

// 全局选中日期变化 → 重新加载该日日记
watch(
  () => app.selectedDate,
  (val) => {
    void loadDate(val)
  }
)

// 日记日期集合变化 → 同步全局日历标记
watch(
  () => diaryStore.diaryDates,
  (dates) => {
    app.setMarkedDates(dates)
  }
)

// 「全部」展开时：首次加载首批 + setup observer；收起时 teardown
watch(
  () => app.showAllList,
  async (open) => {
    if (open) {
      if (diaryStore.pagedDiaries.length === 0) await diaryStore.loadDiariesPage(true)
      nextTick(() => {
        teardownObserver()
        setupObserver()
      })
    } else {
      teardownObserver()
    }
  }
)

onMounted(async () => {
  try {
    await diaryStore.loadDiaryDates()
  } catch (err) {
    console.error('[qingji] 日记数据加载失败：', err)
  }
  await loadDate(app.selectedDate)
})

onBeforeUnmount(() => {
  teardownObserver()
})
</script>

<template>
  <section class="diary-view">
    <!-- 当天日记输入框 -->
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

    <!-- 全部历史日记列表（按需展开） -->
    <div v-if="app.showAllList" class="diary-history">
      <DiaryList
        :diaries="diaryStore.pagedDiaries"
        :selected-date="app.selectedDate"
        @select="handleSelect"
      />
      <div ref="sentinelEl" class="sentinel" aria-hidden="true"></div>
      <div v-if="diaryStore.diariesLoading" class="load-hint">加载中…</div>
      <div
        v-else-if="!diaryStore.diariesHasMore && diaryStore.pagedDiaries.length > 0"
        class="load-hint"
      >
        没有更多了
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

.diary-main {
  display: flex;
  flex-direction: column;
}

.diary-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  min-height: 40vh;
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

.diary-history {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border-subtle);
}

.sentinel {
  height: 1px;
  width: 100%;
}

.load-hint {
  text-align: center;
  padding: 0.75rem 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
}
</style>
