// 任务 store（Pinia setup 风格）
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { TASK_COLORS, type Task } from '@/types'
import { getStorage } from '@/utils/storage'

/** 返回今天的日期字符串 YYYY-MM-DD */
function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 从预设色板随机取一个颜色，可排除某个颜色（用于相邻不同色） */
function pickColor(exclude?: string): string {
  const pool = TASK_COLORS.filter((c) => c !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

export const useTaskStore = defineStore('task', () => {
  /** 当前查看的日期（YYYY-MM-DD） */
  const currentDate = ref<string>(todayStr())
  /** 当前日期下的任务列表（按 order 升序） */
  const tasks = ref<Task[]>([])
  /** 有任务记录的日期集合（用于全局日历标记） */
  const taskDates = ref<string[]>([])

  /** 完成进度 0..1 */
  const progress = computed<number>(() => {
    const total = tasks.value.length
    if (total === 0) return 0
    const done = tasks.value.filter((t) => t.completed).length
    return done / total
  })

  /** 加载指定日期的任务 */
  async function loadTasks(date: string): Promise<void> {
    currentDate.value = date
    tasks.value = await getStorage().getTasksByDate(date)
  }

  /** 加载所有有任务的日期（用于日历标记） */
  async function loadTaskDates(): Promise<void> {
    taskDates.value = await getStorage().getTaskDates()
  }

  /** 新增任务（追加到末尾，颜色与上一个任务不同） */
  async function addTask(content: string): Promise<Task> {
    const lastColor = tasks.value[tasks.value.length - 1]?.color
    const created = await getStorage().createTask({
      date: currentDate.value,
      content,
      completed: false,
      order: tasks.value.length,
      color: pickColor(lastColor)
    })
    tasks.value.push(created)
    // 若该日期尚未标记，加入标记集合
    if (!taskDates.value.includes(created.date)) {
      taskDates.value = [...taskDates.value, created.date]
    }
    return created
  }

  /** 切换任务完成状态 */
  async function toggleTask(id: string): Promise<void> {
    const current = tasks.value.find((t) => t.id === id)
    if (!current) return
    const updated = await getStorage().updateTask(id, {
      completed: !current.completed
    })
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
  }

  /** 更新任务（局部字段） */
  async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
    const updated = await getStorage().updateTask(id, patch)
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
  }

  /** 删除任务 */
  async function deleteTask(id: string): Promise<void> {
    await getStorage().deleteTask(id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  return {
    currentDate,
    tasks,
    taskDates,
    progress,
    loadTasks,
    loadTaskDates,
    addTask,
    toggleTask,
    updateTask,
    deleteTask
  }
})
