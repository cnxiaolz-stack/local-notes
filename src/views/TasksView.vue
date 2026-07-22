<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useTaskStore } from '@/stores/task'
import TaskItem from '@/components/task/TaskItem.vue'
import DatePicker from '@/components/task/DatePicker.vue'

const taskStore = useTaskStore()

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const selectedDate = ref<string>(todayStr())

watch(selectedDate, (val) => {
  taskStore.loadTasks(val)
})

onMounted(() => {
  taskStore.loadTasks(selectedDate.value)
})
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <!-- 日期选择器 -->
    <DatePicker v-model="selectedDate" />

    <!-- 历史任务列表（只读） -->
    <div v-if="taskStore.tasks.length > 0" class="mt-6 space-y-2">
      <TaskItem
        v-for="task in taskStore.tasks"
        :key="task.id"
        :task="task"
        readonly
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="mt-6 card text-center">
      <p class="text-sm" style="color: var(--color-text-secondary)">
        该日期没有任务记录
      </p>
    </div>
  </section>
</template>
