<script setup lang="ts">
// 日记浏览模式（内嵌卡片）：左侧按月分组列表（滚动加载），右侧显示选中日记全文。
// 以卡片形式嵌在日记页内容区内（与编辑器互斥显示，非全屏覆盖），窗口标题栏等框架保持可见。
// 打开时临时收起侧边栏腾出面积（退出恢复原状态，不写 localStorage，用户偏好不受影响）。
// 选中态直接用全局 app.selectedDate（关闭浏览后编辑器停留在最后浏览的那篇，
// 方便"翻到 → 接着编辑"）。前后篇导航基于 diaryStore.diaryDates（全量日期集合）。
// 桌面端左右分栏；移动端（<768px）列表/内容单栏切换。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDiaryStore } from '@/stores/diary'
import { useAppStore } from '@/stores/app'
import { getStorage } from '@/utils/storage'
import DiaryList from '@/components/diary/DiaryList.vue'
import type { Diary } from '@/types'

const emit = defineEmits<{ close: [] }>()

const diaryStore = useDiaryStore()
const app = useAppStore()

/** 右侧显示的全文日记（单条查询，不依赖分页列表是否加载到） */
const browseDiary = ref<Diary | null>(null)
const isLoading = ref<boolean>(false)

/** 移动端视图切换：list = 列表，content = 全文 */
const mobileView = ref<'list' | 'content'>('list')

/** 滚动加载哨兵 */
const sentinelEl = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

// ---------- 前一篇 / 后一篇（相邻有日记的日期，跳过空白日） ----------

const sortedDates = computed(() => [...diaryStore.diaryDates].sort())

/** 比选中日期更早的最近一篇 */
const prevDate = computed<string | null>(() => {
  const earlier = sortedDates.value.filter((d) => d < app.selectedDate)
  return earlier.length ? earlier[earlier.length - 1] : null
})

/** 比选中日期更晚的最近一篇 */
const nextDate = computed<string | null>(() => {
  return sortedDates.value.find((d) => d > app.selectedDate) ?? null
})

function gotoDate(date: string): void {
  app.setSelectedDate(date)
  mobileView.value = 'content'
}

// ---------- 右侧全文加载 ----------

async function loadBrowseDiary(date: string): Promise<void> {
  isLoading.value = true
  try {
    browseDiary.value = await getStorage().getDiary(date)
  } catch (err) {
    console.error('[qingji] 浏览模式加载日记失败：', err)
    browseDiary.value = null
  } finally {
    isLoading.value = false
  }
}

const dateTitle = computed(() => {
  try {
    const [y, m, d] = app.selectedDate.split('-').map(Number)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date(y, (m || 1) - 1, d || 1))
  } catch {
    return app.selectedDate
  }
})

const contentText = computed(() => browseDiary.value?.content ?? '')

// ---------- 列表选中（全局选中日期变化 → 加载全文） ----------

function handleSelect(date: string): void {
  app.setSelectedDate(date)
  mobileView.value = 'content'
}

watch(
  () => app.selectedDate,
  (val) => {
    void loadBrowseDiary(val)
  },
  { immediate: true }
)

// ---------- 滚动加载（分页列表） ----------

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

// ---------- 关闭 ----------

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}

// ---------- 侧边栏联动：进入临时收起，退出恢复 ----------

/** 进入浏览前侧边栏的收起状态，退出浏览时恢复 */
let sidebarWasCollapsed = false

onMounted(async () => {
  document.addEventListener('keydown', onEsc)
  // 临时收起侧边栏给浏览层腾面积（直接赋值不写 localStorage，用户持久偏好不受影响）
  sidebarWasCollapsed = app.sidebarCollapsed
  app.sidebarCollapsed = true
  if (diaryStore.pagedDiaries.length === 0) {
    await diaryStore.loadDiariesPage(true)
  }
  nextTick(() => {
    teardownObserver()
    setupObserver()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEsc)
  teardownObserver()
  // 恢复进入浏览前的侧边栏状态
  app.sidebarCollapsed = sidebarWasCollapsed
})
</script>

<template>
  <div class="diary-browse" aria-label="日记浏览">
    <!-- 标题栏 -->
    <header class="browse-header">
      <h2 class="browse-title">日记浏览</h2>
      <button
        type="button"
        class="browse-exit"
        @click="emit('close')"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        退出
      </button>
    </header>

    <!-- 内容区 -->
    <div class="browse-body" :class="`is-${mobileView}`">
      <!-- 左侧：日记列表 -->
      <div class="browse-list-pane">
        <div class="browse-list-scroll">
          <DiaryList
            :diaries="diaryStore.pagedDiaries"
            :selected-date="app.selectedDate"
            @select="handleSelect"
          />
          <div ref="sentinelEl" class="sentinel" aria-hidden="true"></div>
          <div v-if="diaryStore.diariesLoading" class="load-hint">加载中…</div>
          <div
            v-else-if="
              !diaryStore.diariesHasMore && diaryStore.pagedDiaries.length > 0
            "
            class="load-hint"
          >
            没有更多了
          </div>
        </div>
      </div>

      <!-- 右侧：全文 -->
      <div class="browse-content-pane">
        <!-- 移动端：返回列表 -->
        <button
          type="button"
          class="browse-back"
          @click="mobileView = 'list'"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回列表
        </button>

        <div class="browse-content-inner">
          <!-- 全文信息行：前一篇 / 日期 / 后一篇 -->
          <div class="browse-content-bar">
            <button
              type="button"
              class="browse-nav"
              :disabled="!prevDate"
              :title="prevDate ? `上一篇（${prevDate}）` : '没有更早的日记'"
              @click="prevDate && gotoDate(prevDate)"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              上一篇
            </button>

            <span class="browse-date-title">{{ dateTitle }}</span>

            <button
              type="button"
              class="browse-nav"
              :disabled="!nextDate"
              :title="nextDate ? `下一篇（${nextDate}）` : '没有更晚的日记'"
              @click="nextDate && gotoDate(nextDate)"
            >
              下一篇
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <!-- 正文 -->
          <div v-if="isLoading" class="browse-hint">加载中…</div>
          <pre
            v-else-if="contentText"
            class="browse-content-text"
          >{{ contentText }}</pre>
          <div v-else class="browse-hint">这一天还没有日记内容</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 内嵌卡片：与日记编辑器同一框架位置（.diary-view 内互斥显示），填满内容区 */
.diary-browse {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}

/* ---------- 标题栏 ---------- */
.browse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.browse-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 退出浏览（文字按钮，明确区别于窗口关闭叉叉） */
.browse-exit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 0.625rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 200ms ease, color 200ms ease, background-color 200ms ease;
}
.browse-exit:hover {
  border-color: var(--color-brand);
  color: var(--color-text-primary);
}
.browse-exit:active {
  transform: scale(0.96);
}

/* ---------- 内容区：移动端默认单栏 ---------- */
.browse-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.browse-list-pane {
  display: none;
  flex-direction: column;
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  min-height: 0;
}

.browse-content-pane {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

/* 移动端：列表视图时隐藏内容、内容视图时隐藏列表 */
.browse-body.is-list .browse-content-pane {
  display: none;
}
.browse-body.is-list .browse-list-pane {
  display: flex;
}
.browse-body.is-content .browse-list-pane {
  display: none;
}
.browse-body.is-content .browse-content-pane {
  display: flex;
}

.browse-back {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  margin: 0.5rem 1rem 0;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease;
}
.browse-back:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
}

/* ---------- 桌面端：左右分栏，隐藏返回按钮 ---------- */
@media (min-width: 768px) {
  .browse-header {
    padding: 0.625rem 1.5rem;
  }
  .browse-list-pane {
    display: flex;
  }
  .browse-body.is-content .browse-list-pane {
    display: flex;
  }
  .browse-body.is-content .browse-content-pane {
    display: flex;
  }
  .browse-back {
    display: none;
  }
}

.browse-list-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem;
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

/* ---------- 右侧全文 ---------- */
.browse-content-inner {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0.75rem 1rem 1rem;
}

.browse-content-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.browse-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.35rem 0.6rem;
  border: none;
  border-radius: 0.5rem;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 200ms ease, background-color 200ms ease;
}
.browse-nav:hover:not(:disabled) {
  color: var(--color-brand);
  background-color: var(--color-bg-soft);
}
.browse-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.browse-date-title {
  flex: 1 1 0%;
  min-width: 0;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browse-content-text {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: 1rem 0.25rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  tab-size: 8;
  word-break: break-word;
}

.browse-hint {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

@media (min-width: 768px) {
  .browse-content-inner {
    padding: 0.75rem 1.5rem 1.25rem;
  }
  .browse-content-text {
    padding: 1rem 0.5rem 0.5rem;
    font-size: 1rem;
  }
}
</style>
