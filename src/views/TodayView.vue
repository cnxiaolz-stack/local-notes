<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import TaskItem from '@/components/task/TaskItem.vue'
import TaskInput from '@/components/task/TaskInput.vue'

const taskStore = useTaskStore()

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const dateLabel = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(new Date())

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

onMounted(() => {
  taskStore.loadTasks(todayStr())
})
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <!-- 日期 + 进度文字 -->
    <div class="flex items-end justify-between gap-4">
      <h2 class="text-2xl font-semibold" style="color: var(--color-text-primary)">
        {{ dateLabel }}
      </h2>
      <span
        class="whitespace-nowrap text-sm"
        style="color: var(--color-text-secondary)"
      >
        {{ completedCount }}/{{ totalCount }} 已完成
      </span>
    </div>

    <!-- 进度条 -->
    <div
      class="mt-3 h-2 w-full overflow-hidden rounded-full"
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
        今天还没有任务，添加一个吧
      </p>
    </div>

    <!-- 添加任务 -->
    <TaskInput class="mt-6" placeholder="添加今日任务..." @add="handleAdd" />
  </section>
</template>
