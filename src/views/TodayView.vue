<script setup lang="ts">
// 今日页：合并了原任务页功能。日期由全局 header 的日历按钮驱动（app.selectedDate），
// 可查看任意日期的任务；为选中日期添加任务。
import { computed, onMounted, watch } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useAppStore } from '@/stores/app'
import TaskItem from '@/components/task/TaskItem.vue'
import TaskInput from '@/components/task/TaskInput.vue'

const taskStore = useTaskStore()
const app = useAppStore()

const completedCount = computed(() => taskStore.tasks.filter((t) => t.completed).length)
const totalCount = computed(() => taskStore.tasks.length)
const progressPct = computed(() => Math.round(taskStore.progress * 100))

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

onMounted(async () => {
  await taskStore.loadTaskDates()
  app.setMarkedDates(taskStore.taskDates)
  await taskStore.loadTasks(app.selectedDate)
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
  </section>
</template>
