<script setup lang="ts">
// 今日页：合并了原任务页功能。日期由全局 header 的日历按钮驱动（app.selectedDate），
// 可查看任意日期的任务；为选中日期添加任务。
// 点 header「全部」按钮（app.showAllList）在下方展开全部历史任务列表（按时间倒序，滚动加载）。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useAppStore } from '@/stores/app'
import TaskItem from '@/components/task/TaskItem.vue'
import TaskInput from '@/components/task/TaskInput.vue'
import type { Task } from '@/types'

const taskStore = useTaskStore()
const app = useAppStore()

const completedCount = computed(() => taskStore.tasks.filter((t) => t.completed).length)
const totalCount = computed(() => taskStore.tasks.length)
const progressPct = computed(() => Math.round(taskStore.progress * 100))

/** 滚动加载哨兵 */
const sentinelEl = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

function handleAdd(content: string): void {
  taskStore.addTask(content)
}

function handleToggle(id: string): void {
  taskStore.toggleTask(id)
}

function handleSave(id: string, content: string): void {
  taskStore.updateTask(id, { content })
}

function handleDelete(id: string): void {
  taskStore.deleteTask(id)
}

/** 历史任务日期标签：MM-DD */
function historyDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(y, (m || 1) - 1, d || 1))
}

function setupObserver(): void {
  if (!sentinelEl.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        taskStore.tasksHasMore &&
        !taskStore.tasksLoading
      ) {
        void taskStore.loadTasksPage()
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

// 全局选中日期变化 → 重新加载该日任务
watch(
  () => app.selectedDate,
  (val) => {
    void taskStore.loadTasks(val)
  }
)

// 任务日期集合变化 → 同步全局日历的标记日期
watch(
  () => taskStore.taskDates,
  (dates) => {
    app.setMarkedDates(dates)
  }
)

// 「全部」展开时：首次加载首批 + setup observer；收起时 teardown
watch(
  () => app.showAllList,
  async (open) => {
    if (open) {
      if (taskStore.pagedTasks.length === 0) await taskStore.loadTasksPage(true)
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
  await taskStore.loadTaskDates()
  app.setMarkedDates(taskStore.taskDates)
  await taskStore.loadTasks(app.selectedDate)
})

onBeforeUnmount(() => {
  teardownObserver()
})
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <!-- 进度 -->
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm" style="color: var(--color-text-secondary)">
        {{ completedCount }}/{{ totalCount }} 已完成
      </span>
      <span
        v-if="totalCount > 0"
        class="text-sm font-medium"
        style="color: var(--color-text-secondary)"
      >
        {{ progressPct }}%
      </span>
    </div>

    <!-- 进度条 -->
    <div
      class="mt-2 h-2 w-full overflow-hidden rounded-full"
      style="background-color: var(--color-border)"
    >
      <div
        class="h-full rounded-full transition-all duration-300 ease-out"
        :style="{ width: `${progressPct}%`, backgroundColor: 'var(--color-brand)' }"
      ></div>
    </div>

    <!-- 任务列表 -->
    <div v-if="totalCount > 0" class="mt-6 space-y-2">
      <TaskItem
        v-for="task in taskStore.tasks"
        :key="task.id"
        :task="task"
        @toggle="handleToggle(task.id)"
        @save="handleSave(task.id, $event)"
        @delete="handleDelete(task.id)"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="mt-6 card text-center">
      <p class="text-sm" style="color: var(--color-text-secondary)">
        这一天还没有任务，添加一个吧
      </p>
    </div>

    <!-- 添加任务 -->
    <TaskInput class="mt-6" placeholder="添加任务..." @add="handleAdd" />

    <!-- 全部历史任务列表（按需展开，只读浏览） -->
    <div v-if="app.showAllList" class="task-history">
      <div class="history-title">全部任务</div>
      <div v-if="taskStore.pagedTasks.length === 0 && !taskStore.tasksLoading" class="history-empty">
        还没有任何任务
      </div>
      <ul v-else class="history-list">
        <li
          v-for="task in taskStore.pagedTasks as Task[]"
          :key="task.id"
          class="task-history-row"
          :class="{ 'is-done': task.completed }"
        >
          <span class="history-date">{{ historyDateLabel(task.date) }}</span>
          <span
            class="history-dot"
            :style="{ backgroundColor: task.color ?? 'var(--color-border)' }"
            aria-hidden="true"
          ></span>
          <span class="history-content">{{ task.content }}</span>
        </li>
      </ul>
      <div ref="sentinelEl" class="sentinel" aria-hidden="true"></div>
      <div v-if="taskStore.tasksLoading" class="load-hint">加载中…</div>
      <div
        v-else-if="!taskStore.tasksHasMore && taskStore.pagedTasks.length > 0"
        class="load-hint"
      >
        没有更多了
      </div>
    </div>
  </section>
</template>

<style scoped>
.task-history {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  color: var(--color-text-secondary);
  padding: 0 0.25rem;
}

.history-empty {
  text-align: center;
  padding: 1.5rem 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.task-history-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  transition: border-color 200ms ease;
}
.task-history-row:hover {
  border-color: var(--color-brand);
}
.task-history-row.is-done .history-content {
  text-decoration: line-through;
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.history-date {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-soft);
  padding: 0.125rem 0.4rem;
  border-radius: 0.375rem;
}

.history-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
}

.history-content {
  flex: 1 1 0%;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-text-primary);
  word-break: break-word;
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
